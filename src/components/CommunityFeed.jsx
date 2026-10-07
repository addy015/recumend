import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useItems } from "../context/ItemContext";
import { useAuth } from "../context/AuthContext";
import CategoryFilter from "./CategoryFilter";
import ItemCard from "./ItemCard";

export default function CommunityFeed({
  searchQuery,
  onOpenAddModal,
  onSelectUser,
}) {
  const { items, loading: itemsLoading } = useItems();
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Filtered & Ranked Items (recommend_count >= 1)
  const filteredItems = useMemo(() => {
    let result = [...items];

    if (selectedCategory !== "all") {
      result = result.filter((item) => item.category === selectedCategory);
    }

    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
        if (item.recommend_count < 1) return false;

        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        const matchNote = item.metadata?.note?.toLowerCase().includes(q);
        const matchAuthor = item.metadata?.author?.toLowerCase().includes(q);

        return matchTitle || matchCategory || matchNote || matchAuthor;
      });
    }

    result.sort((a, b) => b.recommend_count - a.recommend_count);
    return result;
  }, [items, selectedCategory, searchQuery]);

  const totalRecommendationsCount = useMemo(() => {
    return items.reduce((acc, it) => acc + (it.recommend_count || 0), 0);
  }, [items]);

  return (
    <div className="space-y-6">

      {/* Category Filter Chips */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Items Ranking Feed */}
      <div className="space-y-2.5">
        {itemsLoading ? (
          <div className="py-16 text-center text-xs font-mono text-zinc-500">
            Loading rankings...
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-16 text-center bg-zinc-950/40 border border-zinc-800 p-8 space-y-3">
            <Search className="w-8 h-8 text-zinc-600 mx-auto" />
            <p className="text-sm font-semibold text-zinc-300">
              No recommended items found
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {searchQuery
                ? `No items matching "${searchQuery}" have at least 1 recommendation on the platform.`
                : "Be the first to add a recommendation in this category!"}
            </p>
            <button
              onClick={onOpenAddModal}
              className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-100 hover:bg-white text-zinc-950 text-xs font-medium transition-colors"
            >
              + Add Recommendation
            </button>
          </div>
        ) : (
          filteredItems.map((item, idx) => (
            <ItemCard
              key={item.id}
              item={item}
              rank={idx + 1}
              onSelectUser={onSelectUser}
            />
          ))
        )}
      </div>
    </div>
  );
}
