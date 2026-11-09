import React, { useState, useEffect, useMemo } from "react";
import {
  Bookmark,
  Edit3,
  Trash2,
  ArrowBigUp,
  ExternalLink,
  Plus,
  AlertCircle,
  Heart,
  Lock,
  Globe,
  Loader2,
  Search
} from "lucide-react";
import { useItems } from "../context/ItemContext";
import { CATEGORIES, getCategoryBadgeClass } from "../constants/categories";
import { getSafeExternalLink } from "../lib/avatar";
import CategoryFilter from "./CategoryFilter";
import EditRecommendationModal from "./EditRecommendationModal";

// User dashboard for managing personal created recommendations, private vault items, and endorsements
export default function MyRecommendations({ onOpenAddModal, searchQuery = "" }) {
  const {
    myItems,
    myPrivateItems = [],
    upvotedItems = [],
    deleteItem,
    toggleRecommend,
    toggleItemPrivacy,
    vaultError,
    refreshPrivateItems,
  } = useItems();

  // Active sub-tab ('created' | 'private' | 'upvoted')
  const [activeTab, setActiveTab] = useState("created");
  const [createdCategory, setCreatedCategory] = useState("all");
  const [upvotedCategory, setUpvotedCategory] = useState("all");
  const [vaultCategory, setVaultCategory] = useState("all");
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [privacyModalItem, setPrivacyModalItem] = useState(null);
  const [isTogglingPrivacy, setIsTogglingPrivacy] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Auto-fetch private items if vault is empty on tab switch (avoids needing full page reload)
  useEffect(() => {
    if (activeTab === "private" && myPrivateItems.length === 0) {
      refreshPrivateItems?.();
    }
  }, [activeTab, myPrivateItems.length, refreshPrivateItems]);

  // Filter created public items by category and search query (Strictly sorted created_at DESC)
  const filteredCreatedItems = useMemo(() => {
    let result = [...myItems];

    if (createdCategory !== "all") {
      result = result.filter((item) => item.category === createdCategory);
    }

    if (searchQuery && typeof searchQuery === "string" && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchCategory = (item.category || "").toLowerCase().includes(q);
        const matchCustomCat = (item.metadata?.custom_category || "").toLowerCase().includes(q);
        const matchNote = (item.metadata?.note || "").toLowerCase().includes(q);
        const matchAuthor = (item.metadata?.author || "").toLowerCase().includes(q);
        const matchPlatform = (item.metadata?.platform || "").toLowerCase().includes(q);
        return matchTitle || matchCategory || matchCustomCat || matchNote || matchAuthor || matchPlatform;
      });
    }

    result.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });

    return result;
  }, [myItems, createdCategory, searchQuery]);

  // Filter upvoted items by category and search query (Strictly sorted created_at DESC)
  const filteredUpvotedItems = useMemo(() => {
    let result = [...upvotedItems];

    if (upvotedCategory !== "all") {
      result = result.filter((item) => item.category === upvotedCategory);
    }

    if (searchQuery && typeof searchQuery === "string" && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
        const matchTitle = (item.title || "").toLowerCase().includes(q);
        const matchCategory = (item.category || "").toLowerCase().includes(q);
        const matchCustomCat = (item.metadata?.custom_category || "").toLowerCase().includes(q);
        const matchNote = (item.metadata?.note || "").toLowerCase().includes(q);
        const matchAuthor = (item.metadata?.author || "").toLowerCase().includes(q);
        const matchPlatform = (item.metadata?.platform || "").toLowerCase().includes(q);
        const matchCreator = (item.creator?.username || "").toLowerCase().includes(q) ||
          (item.creator?.display_name || "").toLowerCase().includes(q);
        return matchTitle || matchCategory || matchCustomCat || matchNote || matchAuthor || matchPlatform || matchCreator;
      });
    }

    result.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });

    return result;
  }, [upvotedItems, upvotedCategory, searchQuery]);

  // Filter private vault items by category and search query (Strictly sorted created_at DESC)
  const filteredPrivateItems = useMemo(() => {
    let result = [...myPrivateItems];

    if (vaultCategory !== "all") {
      result = result.filter((item) => item.category === vaultCategory);
    }

    if (searchQuery && typeof searchQuery === "string" && searchQuery.trim()) {
      const q = searchQuery.trim().toLowerCase();
      result = result.filter((item) => {
        const title = (item.title || "").toLowerCase();
        const category = (item.category || "").toLowerCase();
        const customCat = (item.metadata?.custom_category || "").toLowerCase();
        const note = (item.metadata?.note || "").toLowerCase();
        const author = (item.metadata?.author || "").toLowerCase();
        const platform = (item.metadata?.platform || "").toLowerCase();

        return (
          title.includes(q) ||
          category.includes(q) ||
          customCat.includes(q) ||
          note.includes(q) ||
          author.includes(q) ||
          platform.includes(q)
        );
      });
    }

    result.sort((a, b) => {
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });

    return result;
  }, [myPrivateItems, vaultCategory, searchQuery]);

  // Permanently delete a recommendation created by this user
  const handleDelete = async (itemId) => {
    setDeletingId(itemId);
    setErrorMessage(null);
    const res = await deleteItem(itemId);
    setDeletingId(null);
    setDeleteConfirmItem(null);
    if (res?.error) {
      setErrorMessage(res.error);
    }
  };

  // Toggle item between Public and Private E2EE Vault
  const handleTogglePrivacyConfirm = async () => {
    if (!privacyModalItem) return;
    setIsTogglingPrivacy(true);
    setErrorMessage(null);
    const res = await toggleItemPrivacy(privacyModalItem.id);
    setIsTogglingPrivacy(false);
    setPrivacyModalItem(null);
    if (res?.error) {
      setErrorMessage(res.error);
    }
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-white/[0.08]">
        <div>
          <h2 className="font-display text-xl sm:text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
            <Bookmark className="w-5 h-5 text-zinc-400" />
            <span>Vault & Curation</span>
          </h2>
          <p className="text-xs text-zinc-500 font-mono mt-1">
            Personal recommendations, private encrypted vault, and community endorsements.
          </p>
        </div>

        <div className="flex items-center gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() =>
              onOpenAddModal?.({ isPrivate: activeTab === "private" })
            }
            className="flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-full transition-all active:scale-95 cursor-pointer min-h-[40px]"
          >
            <Plus className="w-4 h-4" />
            <span>Add Recs.</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3.5 bg-rose-950/60 border border-rose-500/30 text-rose-200 text-xs rounded-xl flex items-center justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-300 hover:text-white text-xs px-2 py-0.5 hover:bg-rose-900/50 rounded transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Vault Error Notice */}
      {vaultError && (
        <div className="p-3.5 bg-rose-950/60 border border-rose-500/30 rounded-xl flex items-center gap-2 text-xs text-rose-200">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>Vault notice: {vaultError}</span>
        </div>
      )}

      {/* Sub-Tabs */}
      <div className="flex border-b border-white/[0.08] gap-4 sm:gap-6 overflow-x-auto no-scrollbar">
        <button
          type="button"
          onClick={() => setActiveTab("created")}
          className={`pb-3 text-xs flex items-center gap-2 border-b-2 transition-colors duration-75 cursor-pointer whitespace-nowrap min-h-[44px] ${
            activeTab === "created"
              ? "border-white text-white font-bold"
              : "border-transparent text-white font-medium hover:opacity-80"
          }`}
        >
          <span>Created (Public)</span>
          <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
            activeTab === "created"
              ? "bg-white/20 text-white font-bold"
              : "bg-white/10 text-white"
          }`}>
            {createdCategory !== "all" || searchQuery?.trim()
              ? `${filteredCreatedItems.length}/${myItems.length}`
              : myItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("upvoted")}
          className={`pb-3 text-xs flex items-center gap-2 border-b-2 transition-colors duration-75 cursor-pointer whitespace-nowrap min-h-[44px] ${
            activeTab === "upvoted"
              ? "border-white text-white font-bold"
              : "border-transparent text-white font-medium hover:opacity-80"
          }`}
        >
          <Heart className={`w-3.5 h-3.5 ${activeTab === "upvoted" ? "text-rose-500 fill-rose-500" : "text-rose-400 fill-rose-400/20"}`} />
          <span>Upvoted</span>
          <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full ${
            activeTab === "upvoted"
              ? "bg-white/20 text-white font-bold"
              : "bg-white/10 text-white"
          }`}>
            {upvotedCategory !== "all" || searchQuery?.trim()
              ? `${filteredUpvotedItems.length}/${upvotedItems.length}`
              : upvotedItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("private")}
          className={`pb-3 text-xs flex items-center gap-2 border-b-2 transition-colors duration-75 cursor-pointer whitespace-nowrap min-h-[44px] ${
            activeTab === "private"
              ? "border-white text-white font-bold"
              : "border-transparent text-white font-medium hover:opacity-80"
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-emerald-400" />
          <span>Private Vault</span>
          <span className={`font-mono text-[10px] px-2 py-0.5 rounded-full border border-white/[0.1] ${
            activeTab === "private"
              ? "bg-white/20 text-white font-bold"
              : "bg-white/10 text-white"
          }`}>
            {vaultCategory !== "all" || searchQuery?.trim()
              ? `${filteredPrivateItems.length}/${myPrivateItems.length}`
              : myPrivateItems.length}
          </span>
        </button>
      </div>

      {/* TAB 1: CREATED (PUBLIC) ITEMS */}
      <div className={activeTab === "created" ? "space-y-4" : "hidden"}>
        <CategoryFilter
            selectedCategory={createdCategory}
            onSelectCategory={setCreatedCategory}
          />

          {myItems.length === 0 ? (
            <div className="py-20 text-center bg-[#121212]/92 border border-white/[0.08] rounded-2xl p-8 space-y-4">
              <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-400">
                <Bookmark className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm font-semibold text-white">
                  You haven't added any public recommendations yet
                </p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  Recommend your favorite movies, anime, books, or games to place them on the community leaderboard.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onOpenAddModal?.({
                    isPrivate: false,
                    category: createdCategory !== "all" ? createdCategory : "movie",
                  })
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-full transition-all active:scale-95 cursor-pointer min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add First Recommendation</span>
              </button>
            </div>
          ) : filteredCreatedItems.length === 0 ? (
            <div className="py-20 text-center bg-[#121212]/92 border border-white/[0.08] rounded-2xl p-8 space-y-4">
              <Search className="w-6 h-6 text-zinc-600 mx-auto" />
              <p className="font-display text-sm font-semibold text-white">
                No recommendations found
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery?.trim()
                  ? `No public recommendations matching "${searchQuery}".`
                  : `You haven't added any public recommendations in "${CATEGORIES.find((c) => c.id === createdCategory)?.label || createdCategory}" yet.`}
              </p>
              {createdCategory !== "all" && (
                <button
                  type="button"
                  onClick={() => setCreatedCategory("all")}
                  className="mt-2 px-4 py-2 bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-semibold rounded-full transition-colors cursor-pointer min-h-[36px]"
                >
                  View All ({myItems.length})
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredCreatedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#121212]/92 hover:bg-[#171717] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 taste-card"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-zinc-500">
                      <span className={`text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md font-medium border ${getCategoryBadgeClass(item.category)}`}>
                        {item.category === "other" &&
                        item.metadata?.custom_category
                          ? item.metadata.custom_category
                          : CATEGORIES.find((c) => c.id === item.category)
                              ?.label || item.category}
                      </span>
                      {item.metadata?.year && (
                        <span>{item.metadata.year}</span>
                      )}
                      {item.metadata?.author && (
                        <span className="truncate">
                          by <strong className="text-zinc-300">{item.metadata.author}</strong>
                        </span>
                      )}
                      {item.metadata?.platform && (
                        <span>• {item.metadata.platform}</span>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-sm sm:text-base text-white break-words line-clamp-2">
                      {item.title}
                    </h3>

                    {item.metadata?.note && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed border-l border-white/20 pl-2.5 italic">
                        "{item.metadata.note}"
                      </p>
                    )}

                    {getSafeExternalLink(item.metadata?.channel_link) && (
                      <a
                        href={getSafeExternalLink(item.metadata.channel_link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-white mt-1 transition-colors"
                      >
                        <span>Visit Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-stretch sm:self-center justify-between sm:justify-start pt-2 sm:pt-0 border-t border-white/[0.06] sm:border-t-0">
                    <div className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.08] rounded-xl px-3 py-1.5 text-xs font-mono text-zinc-300">
                      <ArrowBigUp className="w-4 h-4 text-zinc-400" />
                      <span className="font-bold">{item.recommend_count}</span>
                      <span className="text-zinc-500 text-[11px]">votes</span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        onClick={() => setPrivacyModalItem(item)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white text-xs font-medium transition-colors border border-white/[0.1] rounded-xl cursor-pointer min-h-[40px]"
                        title="Move to Private Vault (E2EE)"
                      >
                        <Lock className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="hidden sm:inline">Make Private</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setEditingItem(item)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white text-xs font-medium transition-colors border border-white/[0.1] rounded-xl cursor-pointer min-h-[40px]"
                        title="Edit recommendation details"
                      >
                        <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmItem(item)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-colors border border-rose-500/20 rounded-xl cursor-pointer min-h-[40px]"
                        title="Delete recommendation globally"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* TAB 2: UPVOTED ITEMS */}
      <div className={activeTab === "upvoted" ? "space-y-4" : "hidden"}>
        <CategoryFilter
            selectedCategory={upvotedCategory}
            onSelectCategory={setUpvotedCategory}
          />

          {upvotedItems.length === 0 ? (
            <div className="py-20 text-center bg-[#121212]/92 border border-white/[0.08] rounded-2xl p-8 space-y-4">
              <Heart className="w-8 h-8 text-rose-500/40 mx-auto" />
              <p className="font-display text-sm font-semibold text-white">
                No upvoted recommendations yet
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                Browse the community leaderboard and endorse titles you love.
              </p>
            </div>
          ) : filteredUpvotedItems.length === 0 ? (
            <div className="py-20 text-center bg-[#121212]/92 border border-white/[0.08] rounded-2xl p-8 space-y-4">
              <Search className="w-6 h-6 text-zinc-600 mx-auto" />
              <p className="font-display text-sm font-semibold text-white">
                No upvoted recommendations found
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery?.trim()
                  ? `No upvoted recommendations matching "${searchQuery}".`
                  : `You haven't upvoted any recommendations in "${CATEGORIES.find((c) => c.id === upvotedCategory)?.label || upvotedCategory}" yet.`}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredUpvotedItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#121212]/92 hover:bg-[#171717] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 taste-card"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-zinc-500">
                      <span className={`text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md font-medium border ${getCategoryBadgeClass(item.category)}`}>
                        {item.category === "other" &&
                        item.metadata?.custom_category
                          ? item.metadata.custom_category
                          : CATEGORIES.find((c) => c.id === item.category)
                              ?.label || item.category}
                      </span>
                      {item.metadata?.year && (
                        <span>{item.metadata.year}</span>
                      )}
                      {item.metadata?.author && (
                        <span className="truncate">
                          by <strong className="text-zinc-300">{item.metadata.author}</strong>
                        </span>
                      )}
                      {item.metadata?.platform && (
                        <span>• {item.metadata.platform}</span>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-sm sm:text-base text-white break-words line-clamp-2">
                      {item.title}
                    </h3>

                    {item.metadata?.note && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed border-l border-white/20 pl-2.5 italic">
                        "{item.metadata.note}"
                      </p>
                    )}

                    {getSafeExternalLink(item.metadata?.channel_link) && (
                      <a
                        href={getSafeExternalLink(item.metadata.channel_link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-white mt-1 transition-colors"
                      >
                        <span>Visit Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-stretch sm:self-center justify-between sm:justify-start pt-2 sm:pt-0 border-t border-white/[0.06] sm:border-t-0">
                    <button
                      type="button"
                      onClick={() => toggleRecommend(item.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-black text-xs font-mono font-medium rounded-full transition-colors group cursor-pointer min-h-[40px] shadow-[0_0_12px_rgba(251,191,36,0.2)]"
                      title="Click to remove upvote"
                    >
                      <ArrowBigUp className="w-4 h-4 fill-black stroke-black group-hover:fill-rose-600 group-hover:stroke-rose-600" />
                      <span className="font-bold">{item.recommend_count}</span>
                      <span className="text-[11px] group-hover:hidden">
                        Upvoted
                      </span>
                      <span className="text-[11px] hidden group-hover:inline text-rose-600">
                        Remove
                      </span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* TAB 3: PRIVATE E2EE VAULT ITEMS */}
      <div className={activeTab === "private" ? "space-y-4" : "hidden"}>
        <CategoryFilter
            selectedCategory={vaultCategory}
            onSelectCategory={setVaultCategory}
          />

          {myPrivateItems.length === 0 ? (
            <div className="py-20 text-center bg-[#121212]/92 border border-white/[0.08] rounded-2xl p-8 space-y-4">
              <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-400">
                <Lock className="w-5 h-5" />
              </div>
              <div className="space-y-1">
                <p className="font-display text-sm font-semibold text-white">
                  Your private vault is empty
                </p>
                <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
                  Save your guilty pleasures or private watchlist items here.
                </p>
              </div>
              <button
                type="button"
                onClick={() =>
                  onOpenAddModal?.({
                    isPrivate: true,
                    category: vaultCategory !== "all" ? vaultCategory : "movie",
                  })
                }
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-full transition-all active:scale-95 cursor-pointer min-h-[40px]"
              >
                <Plus className="w-4 h-4" />
                <span>Add Private Recommendation</span>
              </button>
            </div>
          ) : filteredPrivateItems.length === 0 ? (
            <div className="py-20 text-center bg-[#121212]/92 border border-white/[0.08] rounded-2xl p-8 space-y-4">
              <Search className="w-6 h-6 text-zinc-600 mx-auto" />
              <p className="font-display text-sm font-semibold text-white">
                No private recommendations found
              </p>
              <p className="text-xs text-zinc-500 max-w-sm mx-auto">
                {searchQuery?.trim()
                  ? `No private items matching "${searchQuery}" in this category.`
                  : `You haven't added any private recommendations in "${CATEGORIES.find((c) => c.id === vaultCategory)?.label || vaultCategory}" yet.`}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                {vaultCategory !== "all" && (
                  <button
                    type="button"
                    onClick={() => setVaultCategory("all")}
                    className="px-4 py-2 bg-white/[0.08] hover:bg-white/[0.14] text-white text-xs font-semibold rounded-full transition-colors cursor-pointer min-h-[36px]"
                  >
                    View All ({myPrivateItems.length})
                  </button>
                )}
                <button
                  type="button"
                  onClick={() =>
                    onOpenAddModal?.({
                      isPrivate: true,
                      category: vaultCategory !== "all" ? vaultCategory : "movie",
                    })
                  }
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-full transition-all cursor-pointer min-h-[36px]"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    Add in{" "}
                    {vaultCategory !== "all"
                      ? CATEGORIES.find((c) => c.id === vaultCategory)?.label || "Category"
                      : "Vault"}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPrivateItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-[#121212]/92 hover:bg-[#171717] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 taste-card"
                >
                  <div className="flex-1 min-w-0 space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-zinc-500">
                      <span className={`text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md font-medium border ${getCategoryBadgeClass(item.category)}`}>
                        {item.category === "other" &&
                        item.metadata?.custom_category
                          ? item.metadata.custom_category
                          : CATEGORIES.find((c) => c.id === item.category)
                              ?.label || item.category}
                      </span>
                      {item.metadata?.year && (
                        <span>{item.metadata.year}</span>
                      )}
                      {item.metadata?.author && (
                        <span className="truncate">
                          by <strong className="text-zinc-300">{item.metadata.author}</strong>
                        </span>
                      )}
                      {item.metadata?.platform && (
                        <span>• {item.metadata.platform}</span>
                      )}

                    </div>

                    <h3 className="font-display font-bold text-sm sm:text-base text-white break-words line-clamp-2">
                      {item._isDecrypted ||
                      (item.title && item.title !== "[Encrypted Item]") ? (
                        item.title
                      ) : item._decryptionFailed || vaultError ? (
                        <span className="inline-flex items-center gap-1.5 text-zinc-500 font-mono text-xs bg-white/[0.05] px-2 py-0.5 rounded-md border border-white/[0.1]">
                          <Lock className="w-3.5 h-3.5 text-zinc-400 shrink-0" />
                          <span>Encrypted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-zinc-500 font-mono text-xs">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400 shrink-0" />
                          <span>Decrypting...</span>
                        </span>
                      )}
                    </h3>

                    {item.metadata?.note && (
                      <p className="text-xs text-zinc-400 mt-1 line-clamp-2 leading-relaxed border-l border-white/20 pl-2.5 italic">
                        "{item.metadata.note}"
                      </p>
                    )}

                    {getSafeExternalLink(item.metadata?.channel_link) && (
                      <a
                        href={getSafeExternalLink(item.metadata.channel_link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-zinc-500 hover:text-white mt-1 transition-colors"
                      >
                        <span>Visit Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-stretch sm:self-center justify-between sm:justify-start pt-2 sm:pt-0 border-t border-white/[0.06] sm:border-t-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        disabled={!item._isDecrypted}
                        onClick={() => setPrivacyModalItem(item)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border rounded-xl min-h-[40px] ${
                          !item._isDecrypted
                            ? "bg-white/[0.02] text-zinc-600 border-white/[0.04] cursor-not-allowed"
                            : "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border-white/[0.1] cursor-pointer"
                        }`}
                        title={
                          !item._isDecrypted
                            ? "Cannot make public until decrypted"
                            : "Publish this item to the community leaderboard"
                        }
                      >
                        <Globe className="w-3.5 h-3.5" />
                        <span>Make Public</span>
                      </button>

                      <button
                        type="button"
                        disabled={!item._isDecrypted}
                        onClick={() => setEditingItem(item)}
                        className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border rounded-xl min-h-[40px] ${
                          !item._isDecrypted
                            ? "bg-white/[0.02] text-zinc-600 border-white/[0.04] cursor-not-allowed"
                            : "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border-white/[0.1] cursor-pointer"
                        }`}
                        title={
                          !item._isDecrypted
                            ? "Cannot edit until decrypted"
                            : "Edit recommendation details"
                        }
                      >
                        <Edit3 className="w-3.5 h-3.5 text-zinc-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmItem(item)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-colors border border-rose-500/20 rounded-xl cursor-pointer min-h-[40px]"
                        title="Delete recommendation permanently"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                        <span>Delete</span>
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      {/* Privacy Toggle Confirmation Modal */}
      {privacyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="bg-[#141414] rounded-2xl max-w-md w-full p-6 space-y-4 border border-white/[0.12] shadow-2xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-white/[0.06] border border-white/[0.1] flex items-center justify-center shrink-0">
                {privacyModalItem.is_private ? (
                  <Globe className="w-5 h-5 text-zinc-300" />
                ) : (
                  <Lock className="w-5 h-5 text-zinc-300" />
                )}
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-white">
                  {privacyModalItem.is_private
                    ? "Make Recommendation Public?"
                    : "Move to Private Vault?"}
                </h3>
                <p className="text-xs text-zinc-400 mt-0.5">
                  "{privacyModalItem.title}"
                </p>
              </div>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              {privacyModalItem.is_private ? (
                <>
                  This recommendation will be published to the{" "}
                  <strong className="text-white">community leaderboard</strong> with your
                  username as the creator.
                </>
              ) : (
                <>This recommendation will be removed from the public leaderboard and encrypted in your personal vault.</>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setPrivacyModalItem(null)}
                disabled={isTogglingPrivacy}
                className="px-4 py-2 text-xs font-semibold text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTogglePrivacyConfirm}
                disabled={isTogglingPrivacy}
                className="px-5 py-2 text-xs font-semibold bg-white hover:bg-zinc-200 text-black rounded-full transition-all cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5 min-h-[40px]"
              >
                {isTogglingPrivacy && (
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                )}
                <span>
                  {privacyModalItem.is_private ? "Make Public" : "Make Private"}
                </span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Modal */}
      {editingItem && (
        <EditRecommendationModal
          key={editingItem.id}
          item={editingItem}
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="w-full max-w-md bg-[#141414] border border-white/[0.12] rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-400">
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <Trash2 className="w-5 h-5 text-rose-400" />
              </div>
              <h3 className="font-display font-bold text-base text-white">
                Delete Recommendation
              </h3>
            </div>

            <p className="text-xs text-zinc-400 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong className="text-white">"{deleteConfirmItem.title}"</strong>? This will remove it
              from the platform globally.
            </p>

            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-white/[0.08]">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-full transition-colors cursor-pointer min-h-[40px]"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId === deleteConfirmItem.id}
                onClick={() => handleDelete(deleteConfirmItem.id)}
                className="px-5 py-2 bg-rose-600 hover:bg-rose-500 text-white text-xs font-semibold rounded-full transition-colors disabled:opacity-50 cursor-pointer min-h-[40px]"
              >
                {deletingId === deleteConfirmItem.id
                  ? "Deleting..."
                  : "Delete Globally"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
