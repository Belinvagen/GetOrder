"use client";

interface Props {
  categories: { id: number; name: string }[];
  activeId: number | null;
  onSelect: (id: number) => void;
}

export default function CategoryNav({ categories, activeId, onSelect }: Props) {
  return (
    <div className="category-nav flex gap-2 overflow-x-auto pb-2 pt-1">
      {categories.map((cat) => (
        <button
          key={cat.id}
          onClick={() => onSelect(cat.id)}
          className={`flex-shrink-0 rounded-full px-4 py-2 text-sm font-medium transition-all duration-200 ${
            activeId === cat.id
              ? "bg-accent text-white shadow-lg shadow-accent/25"
              : "bg-surface hover:bg-surface-hover text-text-muted hover:text-foreground border border-border/50"
          }`}
        >
          {cat.name}
        </button>
      ))}
    </div>
  );
}
