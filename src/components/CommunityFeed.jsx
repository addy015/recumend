import React, { useState, useMemo } from "react";
import { Search } from "lucide-react";
import { useItems } from "../context/ItemContext";
import CategoryFilter from "./CategoryFilter";
import ItemCard from "./ItemCard";

// Global community leaderboard feed showing top recommended items
export default function CommunityFeed({
  searchQuery,
  onOpenAddModal,
  onSelectUser,
}) {
  const { items, loading: itemsLoading } = useItems();
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Filter items by category and search term, then sort by recommendations and date
  const filteredItems = useMemo(() => {
    let result = [...items];

    // Filter by category tab
    if (selectedCategory !== "all") {
      result = result.filter((item) => item.category === selectedCategory);
    }

    // Filter by search query across title, category, metadata, and creator
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
        if (item.recommend_count < 1) return false;

        const matchTitle = item.title.toLowerCase().includes(q);
        const matchCategory = item.category.toLowerCase().includes(q);
        const matchCustomCat = item.metadata?.custom_category?.toLowerCase().includes(q);
        const matchNote = item.metadata?.note?.toLowerCase().includes(q);
        const matchAuthor = item.metadata?.author?.toLowerCase().includes(q);
        const matchPlatform = item.metadata?.platform?.toLowerCase().includes(q);
        const matchCreator = item.creator?.username?.toLowerCase().includes(q) ||
          item.creator?.display_name?.toLowerCase().includes(q);

        return matchTitle || matchCategory || matchCustomCat || matchNote || matchAuthor || matchPlatform || matchCreator;
      });
    }

    // Rank items: highest vote count first, ties broken by earliest submission
    result.sort((a, b) => {
      const diff = b.recommend_count - a.recommend_count;
      if (diff !== 0) return diff;
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(a.id || '').localeCompare(String(b.id || ''));
    });
    return result;
  }, [items, selectedCategory, searchQuery]);

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
