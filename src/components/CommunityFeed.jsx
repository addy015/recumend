import React, { useState, useMemo } from "react";
import { Search, Trophy, Clock, Plus } from "lucide-react";
import { useItems } from "../context/ItemContext";
import CategoryFilter from "./CategoryFilter";
import ItemCard from "./ItemCard";

// Global community leaderboard feed showing top recommended items
export default function CommunityFeed({
  searchQuery,
  sortBy = "overall",
  onSortChange,
  onOpenAddModal,
  onSelectUser,
}) {
  const { items, loading: itemsLoading } = useItems();
  const [selectedCategory, setSelectedCategory] = useState("all");

  // Filter items by category and search term, then sort by recommendations or recency
  const filteredItems = useMemo(() => {
    let result = items.filter((item) => !item.is_private && item.recommend_count >= 1);

    // Filter by category tab
    if (selectedCategory !== "all") {
      result = result.filter((item) => item.category === selectedCategory);
    }

    // Filter by search query across title, category, metadata, and creator
    if (searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
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

    // Dual-mode sorting:
    // 'recent': strictly reverse-chronological (created_at DESC, id tie-breaker)
    // 'overall': ranked by upvotes (recommend_count DESC, ties broken by earliest submission created_at ASC, id tie-breaker)
    result.sort((a, b) => {
      if (sortBy === "recent") {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return String(a.id || "").localeCompare(String(b.id || ""));
      }

      // Default: 'overall' (Rank by upvotes first, ties broken by earliest submission)
      const diff = (b.recommend_count || 0) - (a.recommend_count || 0);
      if (diff !== 0) return diff;
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (dateA !== dateB) return dateA - dateB;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });

    return result;
  }, [items, selectedCategory, searchQuery, sortBy]);

  return (
    <div className="space-y-6">
      {/* Category Filter Chips */}
      <CategoryFilter
        selectedCategory={selectedCategory}
        onSelectCategory={setSelectedCategory}
      />

      {/* Sub-Header: Dual Sort Control and Count Indicator */}
      <div className="flex items-center justify-between gap-3 flex-wrap">
        {/* Segmented Pill Switcher */}
        <div className="inline-flex items-center p-1 bg-[#141414] border border-white/[0.08] rounded-full">
          <button
            type="button"
            onClick={() => onSortChange?.("overall")}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-mono rounded-full transition-all cursor-pointer min-h-[34px] ${
              sortBy === "overall"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
            title="Ranked strictly by recommendations"
          >
            <Trophy className={`w-3.5 h-3.5 ${sortBy === "overall" ? "text-amber-500 fill-amber-500" : "text-amber-400/80"}`} />
            <span>Leaderboard</span>
          </button>
          <button
            type="button"
            onClick={() => onSortChange?.("recent")}
            className={`flex items-center gap-2 px-4 py-1.5 text-xs font-mono rounded-full transition-all cursor-pointer min-h-[34px] ${
              sortBy === "recent"
                ? "bg-white text-black font-semibold shadow-sm"
                : "text-zinc-400 hover:text-white"
            }`}
            title="Ranked strictly by newest submissions"
          >
            <Clock className={`w-3.5 h-3.5 ${sortBy === "recent" ? "text-sky-500" : "text-sky-400/80"}`} />
            <span>Recent</span>
          </button>
        </div>

        {/* Count Label */}
        <span className="text-xs font-mono text-zinc-500">
          {filteredItems.length} {filteredItems.length === 1 ? "recommendation" : "recommendations"}
        </span>
      </div>

      {/* Items Ranking Feed */}
      <div className="space-y-3">
        {itemsLoading ? (
          <div className="space-y-3">
            {[1, 2, 3].map((n) => (
              <div
                key={n}
                className="h-28 rounded-2xl bg-[#141414] border border-white/[0.06] animate-pulse p-4 flex items-center justify-between"
              >
                <div className="space-y-2 flex-1">
                  <div className="h-4 w-24 bg-white/[0.06] rounded-md" />
                  <div className="h-5 w-64 bg-white/[0.08] rounded-md" />
                  <div className="h-3 w-40 bg-white/[0.04] rounded-md" />
                </div>
                <div className="w-12 h-14 bg-white/[0.06] rounded-xl" />
              </div>
            ))}
          </div>
        ) : filteredItems.length === 0 ? (
          <div className="py-20 text-center bg-[#121212] border border-white/[0.08] rounded-2xl p-8 space-y-4">
            <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-400">
              <Search className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <p className="font-display text-sm font-semibold text-white">
                No recommendations found
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                {searchQuery
                  ? `No items matching "${searchQuery}".`
                  : "Be the first curator to add a recommendation in this category."}
              </p>
            </div>
            <button
              type="button"
              onClick={onOpenAddModal}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-full transition-all active:scale-95 cursor-pointer min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Recommendation</span>
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
