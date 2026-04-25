/**
 * API helper layer for communicating with the FastAPI backend.
 * Uses Next.js rewrites, so all requests go to /api/* (proxied to :8000).
 */

export const API_BASE = "/api";

// ─── Types ───────────────────────────────────────────────────────────────────

export interface Restaurant {
  id: number;
  name: string;
  description: string | null;
  address: string | null;
  traffic_light: "green" | "yellow" | "red";
  pos_mode: boolean;
  telegram_chat_id: number | null;
  tg_pairing_code: string | null;
  logo_url: string | null;
  cover_url: string | null;
  created_at: string;
}

export interface MenuItem {
  id: number;
  category_id: number;
  name: string;
  description: string | null;
  price: number; // in tiyns (÷100 for display)
  image_url: string | null;
  is_active: boolean;
}

export interface Category {
  id: number;
  restaurant_id: number;
  name: string;
  sort_order: number;
  items: MenuItem[];
}

export interface FullMenu {
  restaurant_id: number;
  restaurant_name: string;
  categories: Category[];
}

export interface OrderItem {
  menu_item_id: number;
  name: string;
  quantity: number;
  price: number;
}

export interface OrderResponse {
  id: number;
  user_id: number;
  restaurant_id: number;
  type: "takeout" | "dine_in";
  arrival_time: string | null;
  status: "pending" | "cooking" | "ready" | "completed";
  items_json: string;
  total_amount: number;
  created_at: string;
  pos_message: string | null;
}

export interface User {
  id: number;
  tg_id: number;
  name: string;
  phone: string | null;
  points: number;
  discount: number;
  created_at: string;
}

// ─── API Functions ───────────────────────────────────────────────────────────

export async function fetchRestaurants(): Promise<Restaurant[]> {
  const res = await fetch(`${API_BASE}/restaurants`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch restaurants");
  return res.json();
}

export async function fetchRestaurant(id: number): Promise<Restaurant> {
  const res = await fetch(`${API_BASE}/restaurants/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch restaurant");
  return res.json();
}

export async function fetchMenu(restaurantId: number): Promise<FullMenu> {
  const res = await fetch(`${API_BASE}/restaurants/${restaurantId}/menu`, {
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch menu");
  return res.json();
}

export async function createOrder(payload: {
  user_id?: number;
  restaurant_id: number;
  customer_name: string;
  customer_phone: string;
  type: "takeout" | "dine_in";
  arrival_time?: string;
  items: OrderItem[];
}): Promise<OrderResponse> {
  const res = await fetch(`${API_BASE}/orders`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Failed to create order");
  }
  return res.json();
}

export async function fetchOrder(id: number): Promise<OrderResponse> {
  const res = await fetch(`${API_BASE}/orders/${id}`, { cache: "no-store" });
  if (!res.ok) throw new Error("Failed to fetch order");
  return res.json();
}

/**
 * Format price from tiyns to human-readable string.
 * 25000 → "250 сом"
 */
export function formatPrice(tiyns: number): string {
  const amount = tiyns / 100;
  return amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }) + " сом";
}

// ─── Admin API Functions ─────────────────────────────────────────────────────

function authHeaders(token: string): Record<string, string> {
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  };
}

export async function adminLogin(username: string, password: string): Promise<{ access_token: string; restaurant_id: number }> {
  const res = await fetch(`${API_BASE}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Неверные данные");
  }
  return res.json();
}

export async function adminRegister(data: {
  username: string;
  password: string;
  restaurant_name: string;
  description?: string;
  address?: string;
}): Promise<{ access_token: string; restaurant_id: number }> {
  const res = await fetch(`${API_BASE}/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка регистрации");
  }
  return res.json();
}

export async function fetchRestaurantOrders(
  restaurantId: number,
  token: string
): Promise<OrderResponse[]> {
  const res = await fetch(`${API_BASE}/orders/restaurant/${restaurantId}`, {
    headers: authHeaders(token),
    cache: "no-store",
  });
  if (!res.ok) throw new Error("Failed to fetch orders");
  return res.json();
}

export async function updateOrderStatus(
  orderId: number,
  status: OrderResponse["status"],
  token: string
): Promise<OrderResponse> {
  const res = await fetch(`${API_BASE}/orders/${orderId}/status`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error("Failed to update order status");
  return res.json();
}

export async function toggleItemActive(
  itemId: number,
  isActive: boolean,
  token: string
): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/items/${itemId}/toggle-active`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ is_active: isActive }),
  });
  if (!res.ok) throw new Error("Failed to toggle item");
  return res.json();
}

export async function updateMenuItem(
  itemId: number,
  data: { name?: string; description?: string; price?: number },
  token: string
): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/items/${itemId}`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update item");
  return res.json();
}

export async function updateTrafficLight(
  restaurantId: number,
  trafficLight: Restaurant["traffic_light"],
  token: string
): Promise<Restaurant> {
  const res = await fetch(`${API_BASE}/restaurants/${restaurantId}/traffic-light`, {
    method: "PATCH",
    headers: authHeaders(token),
    body: JSON.stringify({ traffic_light: trafficLight }),
  });
  if (!res.ok) throw new Error("Failed to update traffic light");
  return res.json();
}

export async function updateRestaurant(
  restaurantId: number,
  data: { name?: string; description?: string; address?: string; pos_mode?: boolean },
  token: string
): Promise<Restaurant> {
  const res = await fetch(`${API_BASE}/restaurants/${restaurantId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update restaurant");
  return res.json();
}

// ─── Category CRUD ───────────────────────────────────────────────────────────

export async function createCategory(
  restaurantId: number,
  data: { name: string; sort_order?: number },
  token: string
): Promise<Category> {
  const res = await fetch(`${API_BASE}/restaurants/${restaurantId}/categories`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка создания категории");
  }
  return res.json();
}

export async function updateCategory(
  categoryId: number,
  data: { name?: string; sort_order?: number },
  token: string
): Promise<Category> {
  const res = await fetch(`${API_BASE}/categories/${categoryId}`, {
    method: "PUT",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error("Failed to update category");
  return res.json();
}

export async function deleteCategory(
  categoryId: number,
  token: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/categories/${categoryId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete category");
}

// ─── Menu Item CRUD ──────────────────────────────────────────────────────────

export async function createMenuItem(
  categoryId: number,
  data: { name: string; description?: string; price: number; image_url?: string },
  token: string
): Promise<MenuItem> {
  const res = await fetch(`${API_BASE}/categories/${categoryId}/items`, {
    method: "POST",
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка создания блюда");
  }
  return res.json();
}

export async function deleteMenuItem(
  itemId: number,
  token: string
): Promise<void> {
  const res = await fetch(`${API_BASE}/items/${itemId}`, {
    method: "DELETE",
    headers: authHeaders(token),
  });
  if (!res.ok) throw new Error("Failed to delete item");
}

// ─── Image Uploads ───────────────────────────────────────────────────────────

async function uploadFile(url: string, file: File, token: string): Promise<string> {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(url, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}` },
    body: formData,
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка загрузки файла");
  }
  const data = await res.json();
  return data.logo_url || data.cover_url || data.image_url || "";
}

export async function uploadRestaurantLogo(
  restaurantId: number, file: File, token: string
): Promise<string> {
  return uploadFile(`${API_BASE}/restaurants/${restaurantId}/upload-logo`, file, token);
}

export async function uploadRestaurantCover(
  restaurantId: number, file: File, token: string
): Promise<string> {
  return uploadFile(`${API_BASE}/restaurants/${restaurantId}/upload-cover`, file, token);
}

export async function uploadMenuItemImage(
  itemId: number, file: File, token: string
): Promise<string> {
  return uploadFile(`${API_BASE}/menu/${itemId}/upload-image`, file, token);
}

// ─── Super Admin ─────────────────────────────────────────────────────────────

export interface AdminAccount {
  admin_id: number;
  username: string;
  restaurant_id: number | null;
  restaurant_name: string | null;
  is_active: boolean;
  is_superadmin: boolean;
  has_telegram: boolean;
  created_at: string;
}

export async function getSuperadminAccounts(token: string): Promise<AdminAccount[]> {
  const res = await fetch(`${API_BASE}/superadmin/accounts`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Не удалось загрузить аккаунты");
  return res.json();
}

export async function createSuperadminAccount(
  data: { username: string; password: string; restaurant_name: string; restaurant_description?: string; restaurant_address?: string },
  token: string
): Promise<AdminAccount> {
  const res = await fetch(`${API_BASE}/superadmin/accounts`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || "Ошибка создания аккаунта");
  }
  return res.json();
}

export async function toggleAccountActive(adminId: number, token: string): Promise<{ admin_id: number; is_active: boolean }> {
  const res = await fetch(`${API_BASE}/superadmin/accounts/${adminId}/toggle-active`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Ошибка переключения статуса");
  return res.json();
}

export async function resetAccountPassword(adminId: number, token: string): Promise<{ new_password: string }> {
  const res = await fetch(`${API_BASE}/superadmin/accounts/${adminId}/reset-password`, {
    method: "PATCH",
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error("Ошибка сброса пароля");
  return res.json();
}
