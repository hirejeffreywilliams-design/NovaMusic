import { useState } from "react";
import { useLocation } from "wouter";
import {
  ArrowLeft,
  ShoppingBag,
  ShoppingCart,
  Package,
  Loader2,
  ImageOff,
  Tag,
} from "lucide-react";
import { useQuery, useMutation } from "@tanstack/react-query";

interface MerchItem {
  id: string;
  artistId: string;
  name: string;
  description: string | null;
  price: number;
  imageUrl: string | null;
  category: string;
  stock: number;
  available: boolean;
  createdAt: string;
}

type CategoryFilter = "all" | "apparel" | "vinyl" | "poster" | "digital" | "other";

const CATEGORIES: { id: CategoryFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "apparel", label: "Apparel" },
  { id: "vinyl", label: "Vinyl" },
  { id: "poster", label: "Poster" },
  { id: "digital", label: "Digital" },
  { id: "other", label: "Other" },
];

const CATEGORY_COLORS: Record<string, string> = {
  apparel: "#0EA5E9",
  vinyl: "#F97316",
  poster: "#A855F7",
  digital: "#06B6D4",
  other: "#6B7280",
};

function getCategoryColor(category: string): string {
  return CATEGORY_COLORS[category] || CATEGORY_COLORS.other;
}

function formatPrice(price: number): string {
  return `$${price.toFixed(2)}`;
}

export default function MerchStorePage() {
  const [, navigate] = useLocation();
  const [category, setCategory] = useState<CategoryFilter>("all");
  const [cartCount, setCartCount] = useState(0);
  const [orderingId, setOrderingId] = useState<string | null>(null);

  // For now, fetch all merch — could be scoped to an artist via URL param
  const artistId = "all";

  const { data: items = [], isLoading } = useQuery<MerchItem[]>({
    queryKey: ["/api/merch/artist", artistId],
    queryFn: async () => {
      const res = await fetch(`/api/merch/artist/${artistId}`);
      if (!res.ok) throw new Error("Failed to load merchandise");
      return res.json();
    },
  });

  const orderMutation = useMutation({
    mutationFn: async (merchId: string) => {
      const res = await fetch("/api/merch/order", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: "guest", merchId, quantity: 1 }),
      });
      if (!res.ok) throw new Error("Order failed");
      return res.json();
    },
    onSuccess: () => {
      setCartCount((prev) => prev + 1);
      setOrderingId(null);
    },
    onError: () => {
      setOrderingId(null);
    },
  });

  const handleOrder = (item: MerchItem) => {
    if (!item.available || item.stock <= 0) return;
    setOrderingId(item.id);
    orderMutation.mutate(item.id);
  };

  const filtered = items.filter((item) => {
    if (category === "all") return true;
    return item.category === category;
  });

  return (
    <div className="min-h-screen" style={{ background: "#0a0a0a", color: "#ffffff" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-50 backdrop-blur-md"
        style={{ background: "#0a0a0aee", borderBottom: "1px solid #1e1e1e" }}
      >
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate("/")}
              className="p-2 rounded-lg transition-colors hover:bg-white/5"
              aria-label="Back to home"
            >
              <ArrowLeft className="w-5 h-5" style={{ color: "#999" }} />
            </button>
            <ShoppingBag className="w-6 h-6" style={{ color: "#0EA5E9" }} />
            <h1 className="text-lg sm:text-xl font-bold">Merch Store</h1>
          </div>
          <div className="relative">
            <ShoppingCart className="w-6 h-6" style={{ color: "#06B6D4" }} />
            {cartCount > 0 && (
              <span
                className="absolute -top-2 -right-2 flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold text-white"
                style={{ background: "#0EA5E9" }}
              >
                {cartCount}
              </span>
            )}
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Category Filter */}
        <div
          className="flex rounded-xl p-1 gap-1 overflow-x-auto"
          style={{ background: "#111111", border: "1px solid #1e1e1e" }}
        >
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setCategory(cat.id)}
              className="flex-1 min-w-[70px] rounded-lg px-3 py-2.5 text-sm font-medium transition-all whitespace-nowrap"
              style={{
                background: category === cat.id ? "#0EA5E9" : "transparent",
                color: category === cat.id ? "#ffffff" : "#888",
              }}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-20">
            <Loader2
              className="w-10 h-10 animate-spin mb-4"
              style={{ color: "#0EA5E9" }}
            />
            <p className="text-sm" style={{ color: "#666" }}>
              Loading merchandise...
            </p>
          </div>
        )}

        {/* Empty State */}
        {!isLoading && filtered.length === 0 && (
          <div
            className="flex flex-col items-center justify-center py-20 rounded-xl"
            style={{ background: "#111111", border: "1px solid #1e1e1e" }}
          >
            <Package className="w-12 h-12 mb-4" style={{ color: "#444" }} />
            <p className="text-sm font-medium" style={{ color: "#666" }}>
              No merchandise available
            </p>
            <p className="text-xs mt-2" style={{ color: "#444" }}>
              {category !== "all"
                ? "Try selecting a different category."
                : "Check back later for new items."}
            </p>
          </div>
        )}

        {/* Merch Grid */}
        {!isLoading && filtered.length > 0 && (
          <>
            <p className="text-xs" style={{ color: "#666" }}>
              {filtered.length} item{filtered.length !== 1 ? "s" : ""} available
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filtered.map((item) => {
                const outOfStock = !item.available || item.stock <= 0;
                const catColor = getCategoryColor(item.category);

                return (
                  <div
                    key={item.id}
                    className={`relative rounded-2xl overflow-hidden transition-all ${
                      outOfStock ? "opacity-50 grayscale" : "hover:scale-[1.02]"
                    }`}
                    style={{
                      background: "rgba(17, 17, 17, 0.6)",
                      backdropFilter: "blur(12px)",
                      WebkitBackdropFilter: "blur(12px)",
                      border: "1px solid rgba(255, 255, 255, 0.08)",
                      boxShadow: "0 4px 30px rgba(0, 0, 0, 0.3)",
                    }}
                  >
                    {/* Image Placeholder */}
                    <div
                      className="w-full h-48 flex items-center justify-center"
                      style={{
                        background: `linear-gradient(135deg, ${catColor}10, ${catColor}05)`,
                        borderBottom: "1px solid rgba(255, 255, 255, 0.05)",
                      }}
                    >
                      {item.imageUrl ? (
                        <img
                          src={item.imageUrl}
                          alt={item.name}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageOff className="w-10 h-10" style={{ color: "#333" }} />
                      )}
                    </div>

                    {/* Content */}
                    <div className="p-4 space-y-3">
                      {/* Category Badge */}
                      <div className="flex items-center justify-between">
                        <span
                          className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full"
                          style={{
                            background: `${catColor}15`,
                            color: catColor,
                            border: `1px solid ${catColor}30`,
                          }}
                        >
                          <Tag className="w-2.5 h-2.5" />
                          {item.category}
                        </span>

                        {/* Stock Indicator */}
                        <span
                          className="text-[10px] font-medium"
                          style={{
                            color: outOfStock
                              ? "#EF4444"
                              : item.stock <= 5
                                ? "#F59E0B"
                                : "#22C55E",
                          }}
                        >
                          {outOfStock
                            ? "Out of Stock"
                            : item.stock <= 5
                              ? `Only ${item.stock} left`
                              : `${item.stock} in stock`}
                        </span>
                      </div>

                      {/* Name & Description */}
                      <div>
                        <h3 className="text-sm font-bold text-white truncate">
                          {item.name}
                        </h3>
                        {item.description && (
                          <p
                            className="text-xs mt-1 line-clamp-2"
                            style={{ color: "#888" }}
                          >
                            {item.description}
                          </p>
                        )}
                      </div>

                      {/* Price & Order */}
                      <div className="flex items-center justify-between pt-1">
                        <span
                          className="text-lg font-bold"
                          style={{ color: "#0EA5E9" }}
                        >
                          {formatPrice(item.price)}
                        </span>
                        <button
                          onClick={() => handleOrder(item)}
                          disabled={outOfStock || orderingId === item.id}
                          className="px-4 py-2 rounded-xl text-xs font-bold transition-all disabled:cursor-not-allowed"
                          style={
                            outOfStock
                              ? {
                                  background: "rgba(255, 255, 255, 0.05)",
                                  color: "#555",
                                }
                              : {
                                  background: "#0EA5E9",
                                  color: "#ffffff",
                                  boxShadow: "0 0 20px rgba(14, 165, 233, 0.25)",
                                }
                          }
                        >
                          {orderingId === item.id ? (
                            <span className="flex items-center gap-1.5">
                              <Loader2 className="w-3 h-3 animate-spin" />
                              Ordering...
                            </span>
                          ) : outOfStock ? (
                            "Sold Out"
                          ) : (
                            "Order"
                          )}
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </main>
    </div>
  );
}
