"use client";

import { useEffect, useState } from "react";
import { useAdminStore } from "@/store/adminStore";
import {
  adminLogin,
  fetchRestaurant,
  fetchRestaurantOrders,
  fetchMenu,
  updateOrderStatus,
  toggleItemActive,
  updateTrafficLight,
  updateRestaurant,
  createCategory,
  updateCategory,
  deleteCategory,
  createMenuItem,
  updateMenuItem,
  deleteMenuItem,
  uploadRestaurantLogo,
  uploadRestaurantCover,
  uploadMenuItemImage,
  formatPrice,
  type Restaurant,
  type OrderResponse,
  type FullMenu,
} from "@/lib/api";

// ─── Status Config ───────────────────────────────────────────────────────────

const statusFlow: Record<string, { next: OrderResponse["status"]; label: string }> = {
  pending: { next: "cooking", label: "В работу 🍳" },
  cooking: { next: "ready", label: "Готово ✅" },
  ready: { next: "completed", label: "Завершить 📦" },
};

const statusLabels: Record<string, { label: string; emoji: string; color: string; bg: string; border: string }> = {
  pending: { label: "Новые", emoji: "⏳", color: "text-warning", bg: "bg-warning/10", border: "border-warning/30" },
  cooking: { label: "Готовятся", emoji: "🍳", color: "text-accent-light", bg: "bg-accent/10", border: "border-accent/30" },
  ready: { label: "Готовы", emoji: "✅", color: "text-success", bg: "bg-success/10", border: "border-success/30" },
  completed: { label: "Завершены", emoji: "📦", color: "text-text-muted", bg: "bg-surface", border: "border-border/30" },
};

// ─── Constants ───────────────────────────────────────────────────────────────
const RESTAURANT_ID = 1;
const ADMIN_USERNAME = "burger_admin";
const ADMIN_PASSWORD = "admin123";

// ─── Main Component ──────────────────────────────────────────────────────────

export default function AdminDashboard() {
  const { token, isLoggedIn, restaurantId, login } = useAdminStore();

  const [activeTab, setActiveTab] = useState<"orders" | "menu" | "settings">("orders");
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant | null>(null);
  const [orders, setOrders] = useState<OrderResponse[]>([]);
  const [menu, setMenu] = useState<FullMenu | null>(null);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState<number | null>(null);

  // Auto-login on mount (no manual login needed)
  useEffect(() => {
    if (!isLoggedIn) {
      adminLogin(ADMIN_USERNAME, ADMIN_PASSWORD)
        .then((data) => login(data.access_token, data.restaurant_id))
        .catch(console.error);
    }
  }, [isLoggedIn, login]);

  // Load all data on mount + when token changes
  const loadData = async () => {
    const rid = restaurantId || RESTAURANT_ID;
    setLoading(true);
    
    // Load public data (no auth needed)
    try {
      const menuData = await fetchMenu(rid);
      setMenu(menuData);
    } catch (e) {
      console.error("Failed to load menu:", e);
    }
    
    try {
      const restData = await fetchRestaurant(rid);
      setCurrentRestaurant(restData);
    } catch (e) {
      console.error("Failed to load restaurant:", e);
    }
    
    // Load orders (needs auth)
    if (token) {
      try {
        const ordersData = await fetchRestaurantOrders(rid, token);
        setOrders(ordersData);
      } catch (e) {
        console.error("Failed to load orders:", e);
      }
    }
    
    setLoading(false);
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { loadData(); }, [token]);

  // Auto-refresh orders every 10s
  useEffect(() => {
    if (activeTab !== "orders" || !token) return;
    const rid = restaurantId || RESTAURANT_ID;
    const interval = setInterval(async () => {
      try {
        const fresh = await fetchRestaurantOrders(rid, token!);
        setOrders(fresh);
      } catch { /* ignore */ }
    }, 10000);
    return () => clearInterval(interval);
  }, [activeTab, restaurantId, token]);

  // ─── Handlers ────────────────────────────────────────────────────────────

  const handleStatusChange = async (orderId: number, newStatus: OrderResponse["status"]) => {
    // If R-Keeper mode, show syncing animation
    if (currentRestaurant?.pos_mode && newStatus === "cooking") {
      setSyncing(orderId);
      await new Promise((r) => setTimeout(r, 2000)); // simulate sync
      setSyncing(null);
    }

    try {
      await updateOrderStatus(orderId, newStatus, token!);
      setOrders((prev) =>
        prev.map((o) => (o.id === orderId ? { ...o, status: newStatus } : o))
      );
    } catch { /* ignore */ }
  };

  const handleToggleActive = async (itemId: number, currentActive: boolean) => {
    try {
      await toggleItemActive(itemId, !currentActive, token!);
      setMenu((prev) => {
        if (!prev) return prev;
        return {
          ...prev,
          categories: prev.categories.map((cat) => ({
            ...cat,
            items: cat.items.map((item) =>
              item.id === itemId ? { ...item, is_active: !currentActive } : item
            ),
          })),
        };
      });
    } catch { /* ignore */ }
  };

  const handleTrafficLight = async (color: Restaurant["traffic_light"]) => {
    const rid = restaurantId || RESTAURANT_ID;
    try {
      const updated = await updateTrafficLight(rid, color, token!);
      setCurrentRestaurant(updated);
    } catch { /* ignore */ }
  };

  const handlePosToggle = async () => {
    const rid = restaurantId || RESTAURANT_ID;
    if (!currentRestaurant) return;
    try {
      const updated = await updateRestaurant(
        rid,
        { pos_mode: !currentRestaurant.pos_mode },
        token!
      );
      setCurrentRestaurant(updated);
    } catch { /* ignore */ }
  };

  // ─── Render ──────────────────────────────────────────────────────────────

  const tabs = [
    { key: "orders" as const, label: "Заказы", icon: "📋" },
    { key: "menu" as const, label: "Меню", icon: "🍽️" },
    { key: "settings" as const, label: "Настройки", icon: "⚙️" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Top bar */}
      <div className="sticky top-0 z-50 border-b border-border/50 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto max-w-6xl px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-2xl">🛠️</span>
              <span className="text-xl font-bold bg-gradient-to-r from-accent to-accent-secondary bg-clip-text text-transparent">
                Admin Panel
              </span>
            </div>

            <div className="flex items-center gap-3">
              {currentRestaurant && (
                <span className="text-sm font-medium text-foreground bg-surface border border-border/50 rounded-lg px-3 py-1.5">
                  🏪 {currentRestaurant.name}
                </span>
              )}

              <button
                onClick={loadData}
                className="flex items-center gap-1.5 text-sm font-medium text-accent-secondary hover:text-accent border border-border rounded-lg px-3 py-1.5 transition-colors"
              >
                🔄 Обновить
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="mx-auto max-w-6xl px-4 pt-4">
        <div className="flex gap-1 justify-center border-b border-border/30 pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`flex items-center gap-2 px-5 py-3 text-sm font-semibold rounded-t-lg transition-all ${
                activeTab === tab.key
                  ? "bg-surface border border-b-0 border-border/50 text-foreground"
                  : "text-text-muted hover:text-foreground"
              }`}
            >
              <span>{tab.icon}</span>
              <span>{tab.label}</span>
              {tab.key === "orders" && orders.filter((o) => o.status !== "completed").length > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-accent text-[10px] font-bold text-white px-1">
                  {orders.filter((o) => o.status !== "completed").length}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="mx-auto max-w-6xl px-4 py-6">
        {loading ? (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div key={i} className="skeleton h-32 rounded-xl" />
            ))}
          </div>
        ) : (
          <>
            {activeTab === "orders" && (
              <OrdersKanban
                orders={orders}
                onStatusChange={handleStatusChange}
                syncing={syncing}
                posMode={currentRestaurant?.pos_mode || false}
              />
            )}
            {activeTab === "menu" && (
              menu ? (
                <MenuManager
                  menu={menu}
                  token={token!}
                  restaurantId={restaurantId || RESTAURANT_ID}
                  onToggleActive={handleToggleActive}
                  onReload={loadData}
                />
              ) : (
                <div className="text-center py-16 border border-border rounded-xl bg-surface">
                  <span className="text-4xl block mb-3">🍽️</span>
                  <p className="text-text-muted">Загрузка меню...</p>
                  <button onClick={loadData} className="mt-3 text-sm text-accent-secondary hover:underline">Обновить</button>
                </div>
              )
            )}
            {activeTab === "settings" && (
              currentRestaurant ? (
                <SettingsPanel
                  restaurant={currentRestaurant}
                  token={token!}
                  onTrafficLight={handleTrafficLight}
                  onPosToggle={handlePosToggle}
                  onReload={loadData}
                />
              ) : (
                <div className="text-center py-16 border border-border rounded-xl bg-surface">
                  <span className="text-4xl block mb-3">⚙️</span>
                  <p className="text-text-muted">Загрузка настроек...</p>
                  <button onClick={loadData} className="mt-3 text-sm text-accent-secondary hover:underline">Обновить</button>
                </div>
              )
            )}
          </>
        )}
      </div>
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// ORDERS KANBAN
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function OrdersKanban({
  orders,
  onStatusChange,
  syncing,
  posMode,
}: {
  orders: OrderResponse[];
  onStatusChange: (id: number, status: OrderResponse["status"]) => void;
  syncing: number | null;
  posMode: boolean;
}) {
  const columns: OrderResponse["status"][] = ["pending", "cooking", "ready", "completed"];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {columns.map((col) => {
        const colOrders = orders.filter((o) => o.status === col);
        const cfg = statusLabels[col];

        return (
          <div key={col} className="space-y-3">
            {/* Column header */}
            <div className={`flex items-center justify-between rounded-xl ${cfg.bg} border ${cfg.border} p-3`}>
              <div className="flex items-center gap-2">
                <span>{cfg.emoji}</span>
                <span className={`font-semibold text-sm ${cfg.color}`}>{cfg.label}</span>
              </div>
              <span className={`text-xs font-bold ${cfg.color}`}>{colOrders.length}</span>
            </div>

            {/* Order cards */}
            {colOrders.length === 0 ? (
              <div className="rounded-xl border border-dashed border-border/30 p-6 text-center text-xs text-text-muted/50">
                Пусто
              </div>
            ) : (
              colOrders.map((order) => {
                const items = (() => {
                  try { return JSON.parse(order.items_json) as Array<{ name: string; quantity: number; subtotal: number }>; }
                  catch { return []; }
                })();
                const isSyncing = syncing === order.id;
                const flow = statusFlow[order.status];

                return (
                  <div
                    key={order.id}
                    className={`glass-card p-4 space-y-3 transition-all ${isSyncing ? "ring-2 ring-accent/50 animate-pulse" : ""}`}
                  >
                    {/* R-Keeper sync animation */}
                    {isSyncing && posMode && (
                      <div className="flex items-center gap-2 rounded-lg bg-accent/15 px-3 py-2 text-xs font-medium text-accent-light">
                        <span className="h-3 w-3 border-2 border-accent-light/30 border-t-accent-light rounded-full animate-spin" />
                        Синхронизация с кассой...
                      </div>
                    )}

                    {/* Header */}
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-foreground">#{order.id}</span>
                      <span className="text-[10px] text-text-muted">
                        {order.type === "takeout" ? "🥡" : "🍽️"}{" "}
                        {new Date(order.created_at).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Bishkek",
                        })}
                      </span>
                    </div>

                    {/* Customer info */}
                    {(order.customer_name || order.customer_phone) && (
                      <div className="text-[11px] text-text-muted space-y-0.5">
                        {order.customer_name && <div>👤 {order.customer_name}</div>}
                        {order.customer_phone && <div>📞 {order.customer_phone}</div>}
                      </div>
                    )}

                    {/* Arrival time */}
                    {order.arrival_time && (
                      <div className="flex items-center gap-1.5 rounded-lg bg-accent/10 px-2.5 py-1.5 text-xs font-medium text-accent-light">
                        ⏰ Прибытие: {new Date(order.arrival_time).toLocaleTimeString("ru-RU", {
                          hour: "2-digit",
                          minute: "2-digit",
                          timeZone: "Asia/Bishkek",
                        })}
                      </div>
                    )}

                    {/* Items */}
                    <div className="space-y-1">
                      {items.map((item, i) => (
                        <div key={i} className="flex justify-between text-xs">
                          <span className="text-foreground/80 truncate">
                            {item.name} × {item.quantity}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Total */}
                    <div className="text-sm font-bold text-accent-light">
                      {formatPrice(order.total_amount)}
                    </div>

                    {/* Action button */}
                    {flow && (
                      <button
                        onClick={() => onStatusChange(order.id, flow.next)}
                        disabled={isSyncing}
                        className={`w-full rounded-lg py-2 text-xs font-semibold transition-all ${
                          col === "pending"
                            ? "bg-warning/15 text-warning hover:bg-warning/25"
                            : col === "cooking"
                            ? "bg-success/15 text-success hover:bg-success/25"
                            : "bg-surface hover:bg-surface-hover text-text-muted"
                        } disabled:opacity-40`}
                      >
                        {flow.label}
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        );
      })}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// MENU MANAGER
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function MenuManager({
  menu,
  token,
  restaurantId,
  onToggleActive,
  onReload,
}: {
  menu: FullMenu;
  token: string;
  restaurantId: number;
  onToggleActive: (itemId: number, currentActive: boolean) => void;
  onReload: () => void;
}) {
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCatName, setNewCatName] = useState("");
  const [addingCategory, setAddingCategory] = useState(false);

  const [addingItemToCat, setAddingItemToCat] = useState<number | null>(null);
  const [newItemName, setNewItemName] = useState("");
  const [newItemDesc, setNewItemDesc] = useState("");
  const [newItemPrice, setNewItemPrice] = useState("");
  const [savingItem, setSavingItem] = useState(false);

  const [editingItem, setEditingItem] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [editPrice, setEditPrice] = useState("");
  const [savingEdit, setSavingEdit] = useState(false);

  const [editingCat, setEditingCat] = useState<number | null>(null);
  const [editCatName, setEditCatName] = useState("");

  const [confirmDelete, setConfirmDelete] = useState<{ type: "cat" | "item"; id: number; name: string } | null>(null);

  const [uploadingItemImage, setUploadingItemImage] = useState<number | null>(null);

  const handleUploadItemImage = async (itemId: number, file: File) => {
    setUploadingItemImage(itemId);
    try {
      await uploadMenuItemImage(itemId, file, token!);
      onReload();
    } catch (e) {
      console.error(e);
    }
    setUploadingItemImage(null);
  };

  const handleAddCategory = async () => {
    if (!newCatName.trim()) return;
    setAddingCategory(true);
    try {
      await createCategory(restaurantId, { name: newCatName.trim(), sort_order: menu.categories.length }, token!);
      setNewCatName("");
      setShowAddCategory(false);
      onReload();
    } catch { /* ignore */ }
    setAddingCategory(false);
  };

  const handleSaveCategory = async (catId: number) => {
    if (!editCatName.trim()) return;
    try {
      await updateCategory(catId, { name: editCatName.trim() }, token!);
      setEditingCat(null);
      onReload();
    } catch { /* ignore */ }
  };

  const handleAddItem = async (categoryId: number) => {
    if (!newItemName.trim() || !newItemPrice.trim()) return;
    const priceNum = Math.round(parseFloat(newItemPrice) * 100);
    if (isNaN(priceNum) || priceNum <= 0) return;
    setSavingItem(true);
    try {
      await createMenuItem(categoryId, {
        name: newItemName.trim(),
        description: newItemDesc.trim() || undefined,
        price: priceNum,
      }, token!);
      setNewItemName(""); setNewItemDesc(""); setNewItemPrice("");
      setAddingItemToCat(null);
      onReload();
    } catch { /* ignore */ }
    setSavingItem(false);
  };

  const handleSaveEdit = async (itemId: number) => {
    if (!editName.trim() || !editPrice.trim()) return;
    const priceNum = Math.round(parseFloat(editPrice) * 100);
    if (isNaN(priceNum) || priceNum <= 0) return;
    setSavingEdit(true);
    try {
      await updateMenuItem(itemId, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        price: priceNum,
      }, token!);
      setEditingItem(null);
      onReload();
    } catch { /* ignore */ }
    setSavingEdit(false);
  };

  const handleDelete = async () => {
    if (!confirmDelete) return;
    try {
      if (confirmDelete.type === "cat") {
        await deleteCategory(confirmDelete.id, token!);
      } else {
        await deleteMenuItem(confirmDelete.id, token!);
      }
      onReload();
    } catch { /* ignore */ }
    setConfirmDelete(null);
  };

  const startEditItem = (item: { id: number; name: string; description: string | null; price: number }) => {
    setEditingItem(item.id);
    setEditName(item.name);
    setEditDesc(item.description || "");
    setEditPrice(String(item.price / 100));
  };

  return (
    <div className="space-y-6">
      {/* Add category button */}
      {!showAddCategory ? (
        <button
          onClick={() => setShowAddCategory(true)}
          className="btn-accent rounded-xl px-5 py-3 text-sm flex items-center gap-2"
        >
          <span className="text-lg leading-none">+</span> Добавить категорию
        </button>
      ) : (
        <div className="glass-card p-4 space-y-3 animate-fade-in-up">
          <h4 className="font-semibold text-foreground">Новая категория</h4>
          <input
            type="text"
            placeholder="Название категории"
            value={newCatName}
            onChange={(e) => setNewCatName(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && handleAddCategory()}
            autoFocus
            className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all"
          />
          <div className="flex gap-2">
            <button onClick={handleAddCategory} disabled={addingCategory || !newCatName.trim()} className="btn-accent rounded-lg px-4 py-2 text-xs disabled:opacity-40">
              {addingCategory ? "Создаю..." : "Создать"}
            </button>
            <button onClick={() => { setShowAddCategory(false); setNewCatName(""); }} className="rounded-lg px-4 py-2 text-xs text-text-muted hover:text-foreground bg-surface hover:bg-surface-hover transition-all">
              Отмена
            </button>
          </div>
        </div>
      )}

      {/* Categories */}
      {menu.categories.map((cat) => (
        <div key={cat.id} className="space-y-3">
          {/* Category header */}
          <div className="flex items-center justify-between group">
            {editingCat === cat.id ? (
              <div className="flex items-center gap-2 flex-1">
                <input
                  type="text"
                  value={editCatName}
                  onChange={(e) => setEditCatName(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") handleSaveCategory(cat.id); if (e.key === "Escape") setEditingCat(null); }}
                  autoFocus
                  className="rounded-lg bg-surface border border-accent/50 px-3 py-1.5 text-lg font-bold text-foreground focus:outline-none"
                />
                <button onClick={() => handleSaveCategory(cat.id)} className="text-xs text-success hover:text-success/80">✓</button>
                <button onClick={() => setEditingCat(null)} className="text-xs text-text-muted hover:text-foreground">✕</button>
              </div>
            ) : (
              <h3 className="text-lg font-bold text-foreground flex items-center gap-2">
                {cat.name}
                <span className="text-xs font-normal text-text-muted">({cat.items.length} блюд)</span>
              </h3>
            )}
            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
              {editingCat !== cat.id && (
                <button onClick={() => { setEditingCat(cat.id); setEditCatName(cat.name); }} className="text-xs text-text-muted hover:text-accent-light px-2 py-1 rounded-lg hover:bg-accent/10 transition-all" title="Переименовать">
                  ✏️
                </button>
              )}
              <button onClick={() => setConfirmDelete({ type: "cat", id: cat.id, name: cat.name })} className="text-xs text-text-muted hover:text-danger px-2 py-1 rounded-lg hover:bg-danger/10 transition-all" title="Удалить категорию">
                🗑️
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="space-y-2">
            {cat.items.map((item) => (
              <div key={item.id} className={`glass-card p-4 transition-all ${!item.is_active ? "opacity-50" : ""}`}>
                {editingItem === item.id ? (
                  /* Edit mode */
                  <div className="space-y-3 animate-fade-in-up">
                    <input type="text" placeholder="Название блюда" value={editName} onChange={(e) => setEditName(e.target.value)}
                      className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all" />
                    <input type="text" placeholder="Описание (необязательно)" value={editDesc} onChange={(e) => setEditDesc(e.target.value)}
                      className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all" />
                    <input type="number" placeholder="Цена (сом)" value={editPrice} onChange={(e) => setEditPrice(e.target.value)} min="1" step="1"
                      className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all" />
                    <div className="flex gap-2">
                      <button onClick={() => handleSaveEdit(item.id)} disabled={savingEdit || !editName.trim() || !editPrice.trim()} className="btn-accent rounded-lg px-4 py-2 text-xs disabled:opacity-40">
                        {savingEdit ? "Сохраняю..." : "Сохранить"}
                      </button>
                      <button onClick={() => setEditingItem(null)} className="rounded-lg px-4 py-2 text-xs text-text-muted hover:text-foreground bg-surface hover:bg-surface-hover transition-all">Отмена</button>
                    </div>
                  </div>
                ) : (
                  /* View mode */
                  <div className="flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      {/* Item thumbnail */}
                      <div className="relative h-12 w-12 flex-shrink-0 rounded-lg bg-surface flex items-center justify-center overflow-hidden">
                        {item.image_url ? (
                          <img src={item.image_url} alt="" className="h-full w-full object-cover" />
                        ) : (
                          <span className="text-lg">🍴</span>
                        )}
                        {uploadingItemImage === item.id && (
                          <div className="absolute inset-0 flex items-center justify-center bg-background/70">
                            <div className="h-4 w-4 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                          </div>
                        )}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <h4 className="font-semibold text-foreground truncate">{item.name}</h4>
                          {!item.is_active && (
                            <span className="text-[10px] font-bold text-danger bg-danger/10 px-2 py-0.5 rounded-full flex-shrink-0">СТОП</span>
                          )}
                        </div>
                        {item.description && <p className="text-xs text-text-muted mt-0.5 truncate">{item.description}</p>}
                        <p className="text-sm font-bold text-accent-light mt-1">{formatPrice(item.price)}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <label className="text-xs text-text-muted hover:text-accent-light px-2 py-1.5 rounded-lg hover:bg-accent/10 transition-all cursor-pointer" title="Фото">
                        📷
                        <input type="file" accept="image/*" className="hidden" disabled={uploadingItemImage === item.id}
                          onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUploadItemImage(item.id, f); e.target.value = ""; }} />
                      </label>
                      <button onClick={() => startEditItem(item)} className="text-xs text-text-muted hover:text-accent-light px-2 py-1.5 rounded-lg hover:bg-accent/10 transition-all" title="Редактировать">✏️</button>
                      <button onClick={() => setConfirmDelete({ type: "item", id: item.id, name: item.name })} className="text-xs text-text-muted hover:text-danger px-2 py-1.5 rounded-lg hover:bg-danger/10 transition-all" title="Удалить">🗑️</button>
                      <button
                        onClick={() => onToggleActive(item.id, item.is_active)}
                        className={`relative h-7 w-12 rounded-full transition-all duration-300 ${item.is_active ? "bg-success" : "bg-border"}`}
                      >
                        <span className={`absolute top-0.5 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ${item.is_active ? "left-[calc(100%-1.625rem)]" : "left-0.5"}`} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Add item to this category */}
          {addingItemToCat === cat.id ? (
            <div className="glass-card p-4 space-y-3 animate-fade-in-up border-dashed border-accent/30">
              <h4 className="font-semibold text-foreground text-sm">Новое блюдо в «{cat.name}»</h4>
              <input type="text" placeholder="Название блюда *" value={newItemName} onChange={(e) => setNewItemName(e.target.value)} autoFocus
                className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all" />
              <input type="text" placeholder="Описание (необязательно)" value={newItemDesc} onChange={(e) => setNewItemDesc(e.target.value)}
                className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all" />
              <input type="number" placeholder="Цена в сомах *" value={newItemPrice} onChange={(e) => setNewItemPrice(e.target.value)} min="1" step="1"
                className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all" />
              <div className="flex gap-2">
                <button onClick={() => handleAddItem(cat.id)} disabled={savingItem || !newItemName.trim() || !newItemPrice.trim()} className="btn-accent rounded-lg px-4 py-2 text-xs disabled:opacity-40">
                  {savingItem ? "Добавляю..." : "Добавить блюдо"}
                </button>
                <button onClick={() => { setAddingItemToCat(null); setNewItemName(""); setNewItemDesc(""); setNewItemPrice(""); }} className="rounded-lg px-4 py-2 text-xs text-text-muted hover:text-foreground bg-surface hover:bg-surface-hover transition-all">
                  Отмена
                </button>
              </div>
            </div>
          ) : (
            <button
              onClick={() => { setAddingItemToCat(cat.id); setNewItemName(""); setNewItemDesc(""); setNewItemPrice(""); }}
              className="w-full rounded-xl border-2 border-dashed border-border/30 hover:border-accent/30 py-3 text-sm text-text-muted hover:text-accent-light transition-all flex items-center justify-center gap-2"
            >
              <span className="text-lg leading-none">+</span> Добавить блюдо
            </button>
          )}
        </div>
      ))}

      {menu.categories.length === 0 && (
        <div className="text-center py-16 space-y-3">
          <span className="text-5xl">📋</span>
          <p className="text-text-muted">Меню пока пустое. Добавьте первую категорию!</p>
        </div>
      )}

      {/* Delete confirmation modal */}
      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={() => setConfirmDelete(null)}>
          <div className="glass-card p-6 max-w-sm w-full mx-4 space-y-4 animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-bold text-foreground">Подтвердите удаление</h3>
            <p className="text-sm text-text-muted">
              {confirmDelete.type === "cat"
                ? <>Удалить категорию <strong className="text-foreground">«{confirmDelete.name}»</strong> и все блюда в ней?</>
                : <>Удалить блюдо <strong className="text-foreground">«{confirmDelete.name}»</strong>?</>
              }
            </p>
            <div className="flex gap-2">
              <button onClick={handleDelete} className="flex-1 rounded-xl bg-danger/15 hover:bg-danger/25 text-danger font-semibold py-3 text-sm transition-all">
                Удалить
              </button>
              <button onClick={() => setConfirmDelete(null)} className="flex-1 rounded-xl bg-surface hover:bg-surface-hover text-text-muted font-semibold py-3 text-sm transition-all">
                Отмена
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
// SETTINGS PANEL
// ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

function SettingsPanel({
  restaurant,
  token,
  onTrafficLight,
  onPosToggle,
  onReload,
}: {
  restaurant: Restaurant;
  token: string;
  onTrafficLight: (color: Restaurant["traffic_light"]) => void;
  onPosToggle: () => void;
  onReload: () => void;
}) {
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const [editingInfo, setEditingInfo] = useState(false);
  const [editName, setEditName] = useState(restaurant.name);
  const [editDesc, setEditDesc] = useState(restaurant.description || "");
  const [editAddr, setEditAddr] = useState(restaurant.address || "");
  const [savingInfo, setSavingInfo] = useState(false);

  const handleSaveInfo = async () => {
    if (!editName.trim()) return;
    setSavingInfo(true);
    try {
      await updateRestaurant(restaurant.id, {
        name: editName.trim(),
        description: editDesc.trim() || undefined,
        address: editAddr.trim() || undefined,
      }, token!);
      setEditingInfo(false);
      onReload();
    } catch (e) {
      console.error(e);
    }
    setSavingInfo(false);
  };

  const handleUpload = async (type: "logo" | "cover", file: File) => {
    setUploadError(null);
    const setter = type === "logo" ? setUploadingLogo : setUploadingCover;
    setter(true);
    try {
      if (type === "logo") {
        await uploadRestaurantLogo(restaurant.id, file, token!);
      } else {
        await uploadRestaurantCover(restaurant.id, file, token!);
      }
      onReload();
    } catch (e: unknown) {
      setUploadError(e instanceof Error ? e.message : "Ошибка загрузки");
    }
    setter(false);
  };

  const lights: { value: Restaurant["traffic_light"]; label: string; emoji: string; className: string }[] = [
    { value: "green", label: "Свободно", emoji: "🟢", className: "traffic-green" },
    { value: "yellow", label: "Умеренно", emoji: "🟡", className: "traffic-yellow" },
    { value: "red", label: "Занято", emoji: "🔴", className: "traffic-red" },
  ];

  return (
    <div className="max-w-lg mx-auto space-y-8">
      {/* Restaurant info */}
      <div className="glass-card p-5 space-y-3">
        {editingInfo ? (
          <div className="space-y-3 animate-fade-in-up">
            <h4 className="text-sm font-semibold text-text-muted">Редактирование</h4>
            <input
              type="text"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              placeholder="Название ресторана *"
              className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all"
            />
            <textarea
              value={editDesc}
              onChange={(e) => setEditDesc(e.target.value)}
              placeholder="Описание"
              rows={2}
              className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all resize-none"
            />
            <input
              type="text"
              value={editAddr}
              onChange={(e) => setEditAddr(e.target.value)}
              placeholder="Адрес"
              className="w-full rounded-xl bg-surface border border-border/50 px-4 py-2.5 text-sm text-foreground placeholder:text-text-muted focus:outline-none focus:border-accent/50 transition-all"
            />
            <div className="flex gap-2">
              <button
                onClick={handleSaveInfo}
                disabled={savingInfo || !editName.trim()}
                className="btn-accent rounded-lg px-4 py-2 text-xs disabled:opacity-40"
              >
                {savingInfo ? "Сохраняю..." : "Сохранить"}
              </button>
              <button
                onClick={() => { setEditingInfo(false); setEditName(restaurant.name); setEditDesc(restaurant.description || ""); setEditAddr(restaurant.address || ""); }}
                className="rounded-lg px-4 py-2 text-xs text-text-muted hover:text-foreground bg-surface hover:bg-surface-hover transition-all"
              >
                Отмена
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-1.5 min-w-0">
              <h3 className="text-lg font-bold text-foreground">{restaurant.name}</h3>
              {restaurant.description && <p className="text-sm text-text-muted">{restaurant.description}</p>}
              {restaurant.address && <p className="text-xs text-text-muted">📍 {restaurant.address}</p>}
            </div>
            <button
              onClick={() => setEditingInfo(true)}
              className="flex-shrink-0 text-xs text-text-muted hover:text-accent-light px-2 py-1.5 rounded-lg hover:bg-accent/10 transition-all"
              title="Редактировать"
            >
              ✏️
            </button>
          </div>
        )}
      </div>

      {/* Image uploads */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground">🖼️ Изображения ресторана</h3>

        {uploadError && (
          <div className="rounded-xl bg-danger/10 border border-danger/20 p-3 text-sm text-danger">
            ⚠️ {uploadError}
          </div>
        )}

        <div className="grid grid-cols-2 gap-4">
          {/* Logo */}
          <div className="glass-card p-4 space-y-3">
            <p className="text-sm font-semibold text-foreground">Логотип</p>
            <div className="relative h-24 rounded-xl bg-surface flex items-center justify-center overflow-hidden">
              {restaurant.logo_url ? (
                <img src={restaurant.logo_url} alt="Логотип" className="h-full w-full object-cover rounded-xl" />
              ) : (
                <span className="text-3xl">🏪</span>
              )}
              {uploadingLogo && (
                <div className="absolute inset-0 flex items-center justify-center bg-background/70 rounded-xl">
                  <div className="h-6 w-6 border-2 border-accent border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
            <label className="flex items-center justify-center gap-2 w-full rounded-lg bg-surface hover:bg-surface-hover text-text-muted hover:text-foreground py-2 text-xs cursor-pointer transition-all">
              <span>📎 {restaurant.logo_url ? "Заменить" : "Загрузить"}</span>
              <input type="file" accept="image/*" className="hidden" disabled={uploadingLogo}
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleUpload("logo", f); e.target.value = ""; }} />
            </label>
          </div>


        </div>
      </div>

      {/* Traffic light */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground">🚦 Уровень загруженности</h3>
        <div className="grid grid-cols-3 gap-3">
          {lights.map((light) => (
            <button
              key={light.value}
              onClick={() => onTrafficLight(light.value)}
              className={`glass-card p-4 text-center space-y-3 transition-all cursor-pointer ${
                restaurant.traffic_light === light.value
                  ? "ring-2 ring-accent/50 border-accent/30"
                  : "hover:border-border"
              }`}
            >
              <div className={`h-6 w-6 rounded-full mx-auto ${light.className}`} />
              <span className="text-xs font-semibold text-foreground block">{light.label}</span>
              {restaurant.traffic_light === light.value && (
                <span className="text-[10px] text-accent-light block">Активно</span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* R-Keeper toggle */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground">📡 Интеграция с кассой</h3>
        <div className="glass-card p-5">
          <div className="flex items-center justify-between">
            <div className="space-y-1">
              <p className="font-semibold text-foreground">Имитация R-Keeper</p>
              <p className="text-xs text-text-muted">
                {restaurant.pos_mode
                  ? "Заказы синхронизируются с кассовой системой"
                  : "Ручной режим — заказы обрабатываются вручную"}
              </p>
            </div>

            <button
              onClick={onPosToggle}
              className={`relative flex-shrink-0 h-8 w-14 rounded-full transition-all duration-300 ${
                restaurant.pos_mode ? "bg-accent" : "bg-border"
              }`}
            >
              <span
                className={`absolute top-1 h-6 w-6 rounded-full bg-white shadow-md transition-all duration-300 ${
                  restaurant.pos_mode ? "left-[calc(100%-1.75rem)]" : "left-1"
                }`}
              />
            </button>
          </div>

          {/* Status indicator */}
          <div className={`mt-4 flex items-center gap-2 rounded-lg p-3 text-xs font-medium ${
            restaurant.pos_mode
              ? "bg-accent/10 text-accent-light"
              : "bg-surface text-text-muted"
          }`}>
            <span className={`h-2 w-2 rounded-full ${restaurant.pos_mode ? "bg-accent animate-pulse" : "bg-text-muted"}`} />
            {restaurant.pos_mode ? "Подключено к R-Keeper" : "Оффлайн режим"}
          </div>
        </div>
      </div>
      {/* Telegram Integration */}
      <div className="space-y-4">
        <h3 className="text-base font-bold text-foreground">🤖 Интеграция Telegram</h3>
        <div className="glass-card p-5 space-y-4">
          {restaurant.telegram_chat_id ? (
            <>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-success/10 border border-success/20 p-4">
                <div className="flex items-center gap-3">
                  <span className="text-2xl">✅</span>
                  <div>
                    <p className="font-semibold text-success">Уведомления активны</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      Заказы приходят в бот @GetOrderProjectTGBot
                    </p>
                  </div>
                </div>
                <button
                  onClick={async () => {
                    if (!confirm("Точно отвязать бота? Вы перестанете получать заказы.")) return;
                    try {
                      await fetch(`${API_BASE}/superadmin/restaurants/${restaurant.id}/reset-telegram`, {
                        method: "PATCH",
                        headers: { Authorization: `Bearer ${token}` }
                      });
                      onReload();
                    } catch (e) {
                      alert("Ошибка отвязки. Доступно только суперадмину.");
                    }
                  }}
                  className="px-3 py-1.5 text-xs font-semibold text-danger bg-danger/10 hover:bg-danger/20 rounded-lg transition-all"
                >
                  Отвязать
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="flex items-center gap-3 rounded-xl bg-warning/10 border border-warning/20 p-4">
                <span className="text-2xl">⚠️</span>
                <div>
                  <p className="font-semibold text-warning">Бот не подключён</p>
                  <p className="text-xs text-text-muted mt-0.5">
                    Подключите бота, чтобы получать уведомления о заказах
                  </p>
                </div>
              </div>

              <a
                href={`https://t.me/GetOrderProjectTGBot?start=pair_${restaurant.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center gap-3 w-full rounded-xl bg-[#2AABEE] hover:bg-[#229ED9] text-white font-semibold py-4 px-6 text-sm transition-all duration-200 hover:shadow-lg hover:shadow-[#2AABEE]/20"
              >
                <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/>
                </svg>
                Привязать чат к Telegram
              </a>

              <p className="text-[11px] text-text-muted text-center">
                Нажмите кнопку → отправьте /start боту → чат привяжется автоматически
              </p>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
