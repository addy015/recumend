import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
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
  Search,
  Share2,
  MoreVertical,
  GripVertical,
  ChevronsUp,
  ChevronsDown,
  Check,
  Download
} from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { useItems } from "../context/ItemContext";
import { CATEGORIES, getCategoryBadgeClass } from "../constants/categories";
import { getSafeExternalLink, getAvatarUrl } from "../lib/avatar";
import CategoryFilter from "./CategoryFilter";
import EditRecommendationModal from "./EditRecommendationModal";
import ExportRecsModal from "./ExportRecsModal";

const LOCAL_ORDER_KEY = "recumend_watch_order";

// User dashboard for managing personal created recommendations, private vault items, and endorsements
export default function MyRecommendations({
  onOpenAddModal,
  searchQuery = "",
  onOpenShare,
  onSelectUser,
  onToast
}) {
  const { user, profile } = useAuth();
  const {
    myItems,
    myPrivateItems = [],
    upvotedItems = [],
    deleteItem,
    toggleRecommend,
    toggleItemPrivacy,
    vaultError,
    refreshPrivateItems,
    toggleWatched,
    isWatched
  } = useItems();

  // Active sub-tab ('created' | 'upvoted' | 'private')
  const [activeTab, setActiveTab] = useState("created");
  const [createdCategory, setCreatedCategory] = useState("all");
  const [upvotedCategory, setUpvotedCategory] = useState("all");
  const [vaultCategory, setVaultCategory] = useState("all");

  // Optional filter for watched status ('all' | 'unwatched' | 'watched')
  const [watchedFilter, setWatchedFilter] = useState("all");

  // Export recommendations modal
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Watch order state per sub-tab (Created, Upvoted, Private)
  const [watchOrders, setWatchOrders] = useState(() => {
    const userKey = user?.id || "guest";
    try {
      const raw = localStorage.getItem(`${LOCAL_ORDER_KEY}_${userKey}`);
      return raw ? JSON.parse(raw) : { created: [], upvoted: [], private: [] };
    } catch {
      return { created: [], upvoted: [], private: [] };
    }
  });

  // Drag and drop state
  const [draggedItemId, setDraggedItemId] = useState(null);
  const [dragOverItemId, setDragOverItemId] = useState(null);

  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [privacyModalItem, setPrivacyModalItem] = useState(null);
  const [isTogglingPrivacy, setIsTogglingPrivacy] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);
  const [activeMenuId, setActiveMenuId] = useState(null);
  const backdropMouseDownRef = useRef(false);

  // Sync watch order on user change
  useEffect(() => {
    const userKey = user?.id || "guest";
    try {
      const raw = localStorage.getItem(`${LOCAL_ORDER_KEY}_${userKey}`);
      if (raw) {
        setWatchOrders(JSON.parse(raw));
      }
    } catch {
      // ignore
    }
  }, [user?.id]);

  // Save new watch order
  const saveOrder = useCallback((tabKey, newOrderArray) => {
    const userKey = user?.id || "guest";
    setWatchOrders((prev) => {
      const next = { ...prev, [tabKey]: newOrderArray };
      try {
        localStorage.setItem(`${LOCAL_ORDER_KEY}_${userKey}`, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }, [user?.id]);

  // Sorter: Newly added items (not yet in saved watch order) ALWAYS land at the very top (sorted newest first),
  // followed by custom watch order items (persisting user's drag / move positions).
  const sortWithWatchOrder = useCallback((itemsList, tabKey) => {
    const order = watchOrders[tabKey] || [];
    if (!order.length) {
      return [...itemsList].sort((a, b) => {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return String(a.id || "").localeCompare(String(b.id || ""));
      });
    }

    const orderMap = new Map(order.map((id, index) => [id, index]));

    return [...itemsList].sort((a, b) => {
      const hasA = orderMap.has(a.id);
      const hasB = orderMap.has(b.id);

      // New items (not yet in saved watch order) ALWAYS take precedence at the top
      if (!hasA && hasB) return -1;
      if (hasA && !hasB) return 1;

      // If both are new items, sort newest first
      if (!hasA && !hasB) {
        const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
        const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
        if (dateB !== dateA) return dateB - dateA;
        return String(a.id || "").localeCompare(String(b.id || ""));
      }

      // If both are in saved watch order, sort by user's assigned position
      const posA = orderMap.get(a.id);
      const posB = orderMap.get(b.id);
      if (posA !== posB) return posA - posB;

      // Stable fallback
      const dateA = a.created_at ? new Date(a.created_at).getTime() : 0;
      const dateB = b.created_at ? new Date(b.created_at).getTime() : 0;
      if (dateB !== dateA) return dateB - dateA;
      return String(a.id || "").localeCompare(String(b.id || ""));
    });
  }, [watchOrders]);

  // Helper to get currently visible effective list for a sub-tab in exact display order
  const getEffectiveList = useCallback((tabKey) => {
    const baseItems =
      tabKey === "created"
        ? myItems
        : tabKey === "upvoted"
        ? upvotedItems
        : myPrivateItems;
    return sortWithWatchOrder(baseItems, tabKey);
  }, [myItems, upvotedItems, myPrivateItems, sortWithWatchOrder]);

  // Move item to top
  const handleMoveToTop = (tabKey, itemId) => {
    const effectiveIds = getEffectiveList(tabKey).map((it) => it.id);
    const filtered = effectiveIds.filter((id) => id !== itemId);
    const nextOrder = [itemId, ...filtered];
    saveOrder(tabKey, nextOrder);
    onToast?.({ message: "Moved to top of your watch order" });
  };

  // Move item to bottom
  const handleMoveToBottom = (tabKey, itemId) => {
    const effectiveIds = getEffectiveList(tabKey).map((it) => it.id);
    const filtered = effectiveIds.filter((id) => id !== itemId);
    const nextOrder = [...filtered, itemId];
    saveOrder(tabKey, nextOrder);
    onToast?.({ message: "Moved to bottom of your watch order" });
  };

  // Drag handlers
  const handleDragStart = (e, itemId) => {
    setDraggedItemId(itemId);
    e.dataTransfer.effectAllowed = "move";
  };

  const handleDragOver = (e, itemId) => {
    e.preventDefault();
    if (dragOverItemId !== itemId) {
      setDragOverItemId(itemId);
    }
  };

  const handleDrop = (e, tabKey, targetItemId) => {
    e.preventDefault();
    if (!draggedItemId || draggedItemId === targetItemId) {
      setDraggedItemId(null);
      setDragOverItemId(null);
      return;
    }

    const effectiveIds = getEffectiveList(tabKey).map((it) => it.id);
    const sourceIdx = effectiveIds.indexOf(draggedItemId);
    const targetIdx = effectiveIds.indexOf(targetItemId);

    if (sourceIdx !== -1 && targetIdx !== -1) {
      effectiveIds.splice(sourceIdx, 1);
      effectiveIds.splice(targetIdx, 0, draggedItemId);
      saveOrder(tabKey, effectiveIds);
    }

    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  const handleDragEnd = () => {
    setDraggedItemId(null);
    setDragOverItemId(null);
  };

  // Close modals on Escape key
  useEffect(() => {
    if (!privacyModalItem && !deleteConfirmItem) return;
    function handleKeyDown(e) {
      if (e.key === "Escape") {
        if (!isTogglingPrivacy) setPrivacyModalItem(null);
        if (!deletingId) setDeleteConfirmItem(null);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [privacyModalItem, deleteConfirmItem, isTogglingPrivacy, deletingId]);

  // Close 3-dots card menu on click outside or Escape
  useEffect(() => {
    if (!activeMenuId) return;
    function handleClickOutside(e) {
      if (!e.target.closest("[data-card-menu]")) {
        setActiveMenuId(null);
      }
    }
    function handleKeyDown(e) {
      if (e.key === "Escape") setActiveMenuId(null);
    }
    document.addEventListener("mousedown", handleClickOutside);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [activeMenuId]);

  // Auto-fetch private items if vault is empty on tab switch (avoids needing full page reload)
  useEffect(() => {
    if (activeTab === "private" && myPrivateItems.length === 0) {
      refreshPrivateItems?.();
    }
  }, [activeTab, myPrivateItems.length, refreshPrivateItems]);


  // Filter created public items by category, search query, and watched filter
  const filteredCreatedItems = useMemo(() => {
    let result = [...myItems];

    if (createdCategory !== "all") {
      result = result.filter((item) => item.category === createdCategory);
    }

    if (watchedFilter === "watched") {
      result = result.filter((item) => isWatched(item.id));
    } else if (watchedFilter === "unwatched") {
      result = result.filter((item) => !isWatched(item.id));
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

    return sortWithWatchOrder(result, "created");
  }, [myItems, createdCategory, watchedFilter, isWatched, searchQuery, sortWithWatchOrder]);

  // Filter upvoted items by category, search query, and watched filter
  const filteredUpvotedItems = useMemo(() => {
    let result = [...upvotedItems];

    if (upvotedCategory !== "all") {
      result = result.filter((item) => item.category === upvotedCategory);
    }

    if (watchedFilter === "watched") {
      result = result.filter((item) => isWatched(item.id));
    } else if (watchedFilter === "unwatched") {
      result = result.filter((item) => !isWatched(item.id));
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

    return sortWithWatchOrder(result, "upvoted");
  }, [upvotedItems, upvotedCategory, watchedFilter, isWatched, searchQuery, sortWithWatchOrder]);

  // Filter private vault items by category, search query, and watched filter
  const filteredPrivateItems = useMemo(() => {
    let result = [...myPrivateItems];

    if (vaultCategory !== "all") {
      result = result.filter((item) => item.category === vaultCategory);
    }

    if (watchedFilter === "watched") {
      result = result.filter((item) => isWatched(item.id));
    } else if (watchedFilter === "unwatched") {
      result = result.filter((item) => !isWatched(item.id));
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

    return sortWithWatchOrder(result, "private");
  }, [myPrivateItems, vaultCategory, watchedFilter, isWatched, searchQuery, sortWithWatchOrder]);

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

        <div className="flex items-center gap-2.5 self-start sm:self-auto">
          {/* Export Button */}
          <button
            type="button"
            onClick={() => setIsExportModalOpen(true)}
            className="flex items-center gap-2 px-4 py-2.5 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-200 hover:text-white text-xs font-mono rounded-full border border-white/[0.1] transition-all cursor-pointer min-h-[40px]"
            aria-label="Export recommendations as TXT or PDF"
          >
            <Download className="w-3.5 h-3.5 text-amber-400" />
            <span>Export</span>
          </button>

          {/* Add Recs Button */}
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
            {myItems.length}
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
            {upvotedItems.length}
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
            {myPrivateItems.length}
          </span>
        </button>
      </div>

      {/* Filter Toolbar: Watched Filter + Category Chips */}
      <div className="space-y-3">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-1 bg-black/40 border border-white/[0.08] p-1 rounded-xl">
            <button
              type="button"
              onClick={() => setWatchedFilter("all")}
              className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                watchedFilter === "all"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => setWatchedFilter("unwatched")}
              className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                watchedFilter === "unwatched"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Unwatched
            </button>
            <button
              type="button"
              onClick={() => setWatchedFilter("watched")}
              className={`px-3 py-1 text-xs font-mono rounded-lg transition-colors cursor-pointer ${
                watchedFilter === "watched"
                  ? "bg-white text-black font-semibold shadow-sm"
                  : "text-zinc-400 hover:text-white"
              }`}
            >
              Watched
            </button>
          </div>

          <span className="text-xs font-mono text-zinc-500">
            {activeTab === "created"
              ? `${filteredCreatedItems.length} recommendations`
              : activeTab === "upvoted"
              ? `${filteredUpvotedItems.length} recommendations`
              : `${filteredPrivateItems.length} recommendations`}
          </span>
        </div>

        {/* Category Chips */}
        {activeTab === "created" && (
          <CategoryFilter
            selectedCategory={createdCategory}
            onSelectCategory={setCreatedCategory}
          />
        )}
        {activeTab === "upvoted" && (
          <CategoryFilter
            selectedCategory={upvotedCategory}
            onSelectCategory={setUpvotedCategory}
          />
        )}
        {activeTab === "private" && (
          <CategoryFilter
            selectedCategory={vaultCategory}
            onSelectCategory={setVaultCategory}
          />
        )}
      </div>

      {/* TAB 1: CREATED (PUBLIC) ITEMS */}
      <div className={activeTab === "created" ? "space-y-4" : "hidden"}>
        {myItems.length === 0 ? (
          <div className="py-20 text-center bg-[#121212]/92 border border-white/[0.08] rounded-2xl p-8 space-y-4">
            <div className="w-10 h-10 rounded-full bg-white/[0.04] border border-white/[0.08] flex items-center justify-center mx-auto text-zinc-400">
              <Bookmark className="w-5 h-5" />
            </div>
            <p className="font-display text-sm font-semibold text-white">
              No recommendations yet
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
              Share your favorite movies, books, games, and more with the community.
            </p>
            <button
              type="button"
              onClick={() => onOpenAddModal?.({ isPrivate: false })}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-white hover:bg-zinc-200 text-black text-xs font-semibold rounded-full transition-all cursor-pointer min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add Your First Recommendation</span>
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
                ? `No recommendations matching "${searchQuery}".`
                : `No items found matching the selected filter.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredCreatedItems.map((item) => {
              const isMenuActive = activeMenuId === item.id;
              const isItemWatched = isWatched(item.id);

              return (
                <div
                  key={item.id}
                  draggable={!searchQuery?.trim()}
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDrop={(e) => handleDrop(e, "created", item.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-[#121212]/92 hover:bg-[#171717] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 taste-card ${
                    isMenuActive ? "relative z-30" : "relative z-0"
                  } ${
                    isItemWatched ? "opacity-50 hover:opacity-75" : "opacity-100"
                  } ${dragOverItemId === item.id ? "border-amber-400/60 shadow-lg" : ""}`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {/* Drag Grip Handle */}
                    <div
                      className="shrink-0 pt-1 text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing p-1 transition-colors select-none hidden sm:block"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-zinc-500">
                        <span className={`text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md font-medium border ${getCategoryBadgeClass(item.category)}`}>
                          {item.category === "other" && item.metadata?.custom_category
                            ? item.metadata.custom_category
                            : CATEGORIES.find((c) => c.id === item.category)?.label || item.category}
                        </span>
                        {item.metadata?.year && <span>{item.metadata.year}</span>}
                        {item.metadata?.author && (
                          <span className="truncate">
                            by <strong className="text-zinc-300">{item.metadata.author}</strong>
                          </span>
                        )}
                        {item.metadata?.platform && <span>• {item.metadata.platform}</span>}
                      </div>

                      <h3 className={`font-display font-bold text-sm sm:text-base break-words line-clamp-2 transition-colors duration-75 ${
                        isItemWatched
                          ? "text-zinc-500 line-through decoration-zinc-500/80 decoration-2"
                          : "text-white"
                      }`}>
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
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-stretch sm:self-center justify-between sm:justify-start pt-2 sm:pt-0 border-t border-white/[0.06] sm:border-t-0">
                    <div className="flex items-center gap-1 sm:hidden">
                      <span className="text-[11px] font-mono text-zinc-500">
                        {item.recommend_count} {item.recommend_count === 1 ? "rec" : "recs"}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5 sm:gap-2">
                      {/* Watched Tickbox Button (to the left of Share button) */}
                      <button
                        type="button"
                        onClick={() => toggleWatched(item.id)}
                        className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border text-xs font-medium transition-all active:scale-95 duration-75 cursor-pointer min-h-[40px] select-none ${
                          isItemWatched
                            ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300"
                            : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1] text-zinc-400 hover:text-zinc-200"
                        }`}
                        aria-label={isItemWatched ? "Mark as unwatched" : "Mark as watched"}
                      >
                        <span
                          className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                            isItemWatched
                              ? "bg-emerald-500 border-emerald-400 text-black"
                              : "border-zinc-500 bg-transparent"
                          }`}
                        >
                          {isItemWatched && <Check className="w-3 h-3 stroke-[3]" />}
                        </span>
                        <span className="text-[11px] font-mono hidden sm:inline">
                          {isItemWatched ? "Watched" : "Watch"}
                        </span>
                      </button>

                      {/* Share Button */}
                      <button
                        type="button"
                        onClick={() => onOpenShare?.(item)}
                        className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white text-xs font-medium transition-colors border border-white/[0.1] rounded-xl cursor-pointer min-h-[40px]"
                        aria-label="Share recommendation"
                      >
                        <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                        <span className="hidden sm:inline">Share</span>
                      </button>

                      {/* 3-Dots Dropdown Menu */}
                      <div className={`relative ${isMenuActive ? "z-40" : ""}`} data-card-menu>
                        <button
                          type="button"
                          onClick={() => setActiveMenuId(isMenuActive ? null : item.id)}
                          className="p-2.5 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/[0.1] rounded-xl cursor-pointer min-h-[40px] flex items-center justify-center transition-colors"
                          aria-label="More options"
                        >
                          <MoreVertical className="w-4 h-4 text-zinc-400" />
                        </button>

                        {isMenuActive && (
                          <div className="absolute right-0 mt-1.5 w-44 bg-[#141414] border border-white/[0.12] p-1.5 shadow-2xl rounded-2xl z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
                            {/* Move to Top */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                handleMoveToTop("created", item.id);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer min-h-[36px]"
                            >
                              <ChevronsUp className="w-4 h-4 text-amber-400" />
                              <span>Move to Top</span>
                            </button>

                            {/* Move to Bottom */}
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                handleMoveToBottom("created", item.id);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer min-h-[36px]"
                            >
                              <ChevronsDown className="w-4 h-4 text-zinc-400" />
                              <span>Move to Bottom</span>
                            </button>

                            <div className="border-t border-white/[0.08] pt-1 mt-1">
                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setEditingItem(item);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer min-h-[36px]"
                              >
                                <Edit3 className="w-4 h-4 text-zinc-400" />
                                <span>Edit</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setPrivacyModalItem(item);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer min-h-[36px]"
                              >
                                <Lock className="w-4 h-4 text-zinc-400" />
                                <span>Make Private</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setActiveMenuId(null);
                                  setDeleteConfirmItem(item);
                                }}
                                className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-xl text-left transition-colors cursor-pointer min-h-[36px]"
                              >
                                <Trash2 className="w-4 h-4" />
                                <span>Delete</span>
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TAB 2: UPVOTED ITEMS */}
      <div className={activeTab === "upvoted" ? "space-y-4" : "hidden"}>
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
                : `No upvoted items match the selected filter.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUpvotedItems.map((item) => {
              const isMenuActive = activeMenuId === item.id;
              const isItemWatched = isWatched(item.id);

              return (
                <div
                  key={item.id}
                  draggable={!searchQuery?.trim()}
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDrop={(e) => handleDrop(e, "upvoted", item.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-[#121212]/92 hover:bg-[#171717] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 taste-card ${
                    isMenuActive ? "relative z-30" : "relative z-0"
                  } ${
                    isItemWatched ? "opacity-50 hover:opacity-75" : "opacity-100"
                  } ${dragOverItemId === item.id ? "border-amber-400/60 shadow-lg" : ""}`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {/* Drag Grip Handle */}
                    <div
                      className="shrink-0 pt-1 text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing p-1 transition-colors select-none hidden sm:block"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-zinc-500">
                        <span className={`text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md font-medium border ${getCategoryBadgeClass(item.category)}`}>
                          {item.category === "other" && item.metadata?.custom_category
                            ? item.metadata.custom_category
                            : CATEGORIES.find((c) => c.id === item.category)?.label || item.category}
                        </span>
                        {item.metadata?.year && <span>{item.metadata.year}</span>}
                        {item.metadata?.author && (
                          <span className="truncate">
                            by <strong className="text-zinc-300">{item.metadata.author}</strong>
                          </span>
                        )}
                        {item.metadata?.platform && <span>• {item.metadata.platform}</span>}
                      </div>

                      <h3 className={`font-display font-bold text-sm sm:text-base break-words line-clamp-2 transition-colors duration-75 ${
                        isItemWatched
                          ? "text-zinc-500 line-through decoration-zinc-500/80 decoration-2"
                          : "text-white"
                      }`}>
                        {item.title}
                      </h3>

                      {/* Recommender Note & Username Attribution (Exact Leaderboard Style) */}
                      {(item.metadata?.note || item.creator?.username) && (
                        <div className="pt-1 flex items-baseline justify-between gap-3 flex-wrap sm:flex-nowrap">
                          {item.metadata?.note ? (
                            <div className="flex-1 min-w-0">
                              <p className="border-l-2 border-amber-400/40 pl-2.5 text-xs text-zinc-300 italic leading-relaxed break-words line-clamp-2">
                                "{item.metadata.note}"
                              </p>
                            </div>
                          ) : (
                            <div className="flex-1" />
                          )}

                          {item.creator?.username && (
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                if (onSelectUser) {
                                  onSelectUser(item.creator);
                                } else {
                                  window.location.assign(`/u/${item.creator.username}`);
                                }
                              }}
                              className="shrink-0 flex items-center gap-1.5 font-mono text-[11px] text-zinc-500 hover:text-white transition-colors cursor-pointer group/user self-end sm:self-auto min-h-[26px]"
                              aria-label={`View @${item.creator.username}'s public profile`}
                            >
                              <img
                                src={getAvatarUrl(item.creator.avatar_url, item.creator.display_name || item.creator.username)}
                                alt=""
                                className="w-4 h-4 object-cover rounded-full shrink-0"
                                onError={(e) => {
                                  e.currentTarget.src = getAvatarUrl(null, item.creator.display_name || item.creator.username);
                                }}
                              />
                              <span>
                                <span className="text-zinc-600">@</span>
                                <span className="hover:underline text-zinc-400 group-hover/user:text-white">
                                  {item.creator.username}
                                </span>
                              </span>
                            </button>
                          )}
                        </div>
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
                  </div>

                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-stretch sm:self-center justify-between sm:justify-start pt-2 sm:pt-0 border-t border-white/[0.06] sm:border-t-0">
                    {/* Watched Tickbox Button (to the left of Share button) */}
                    <button
                      type="button"
                      onClick={() => toggleWatched(item.id)}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border text-xs font-medium transition-all active:scale-95 duration-75 cursor-pointer min-h-[40px] select-none ${
                        isItemWatched
                          ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300"
                          : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1] text-zinc-400 hover:text-zinc-200"
                      }`}
                      aria-label={isItemWatched ? "Mark as unwatched" : "Mark as watched"}
                    >
                      <span
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          isItemWatched
                            ? "bg-emerald-500 border-emerald-400 text-black"
                            : "border-zinc-500 bg-transparent"
                        }`}
                      >
                        {isItemWatched && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <span className="text-[11px] font-mono hidden sm:inline">
                        {isItemWatched ? "Watched" : "Watch"}
                      </span>
                    </button>

                    {/* Share Button */}
                    <button
                      type="button"
                      onClick={() => onOpenShare?.(item)}
                      className="flex items-center gap-1.5 px-3 py-2 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white text-xs font-medium transition-colors border border-white/[0.1] rounded-xl cursor-pointer min-h-[40px]"
                      aria-label="Share recommendation"
                    >
                      <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="hidden sm:inline">Share</span>
                    </button>

                    {/* Upvote Pill */}
                    <button
                      type="button"
                      onClick={() => toggleRecommend(item.id)}
                      className="flex items-center gap-2 px-4 py-2 bg-amber-400 text-black text-xs font-mono font-medium rounded-full transition-colors group cursor-pointer min-h-[40px] shadow-[0_0_12px_rgba(251,191,36,0.2)]"
                      aria-label="Remove recommendation"
                    >
                      <ArrowBigUp className="w-4 h-4 fill-black stroke-black group-hover:fill-rose-600 group-hover:stroke-rose-600" />
                      <span className="font-bold">{item.recommend_count}</span>
                      <span className="text-[11px] group-hover:hidden">Upvoted</span>
                      <span className="text-[11px] hidden group-hover:inline text-rose-600">Remove</span>
                    </button>

                    {/* 3-Dots Dropdown Menu */}
                    <div className={`relative ${isMenuActive ? "z-40" : ""}`} data-card-menu>
                      <button
                        type="button"
                        onClick={() => setActiveMenuId(isMenuActive ? null : item.id)}
                        className="p-2.5 bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border border-white/[0.1] rounded-xl cursor-pointer min-h-[40px] flex items-center justify-center transition-colors"
                        aria-label="More options"
                      >
                        <MoreVertical className="w-4 h-4 text-zinc-400" />
                      </button>

                      {isMenuActive && (
                        <div className="absolute right-0 mt-1.5 w-44 bg-[#141414] border border-white/[0.12] p-1.5 shadow-2xl rounded-2xl z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
                          {/* Move to Top */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              handleMoveToTop("upvoted", item.id);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer min-h-[36px]"
                          >
                            <ChevronsUp className="w-4 h-4 text-amber-400" />
                            <span>Move to Top</span>
                          </button>

                          {/* Move to Bottom */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              handleMoveToBottom("upvoted", item.id);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer min-h-[36px]"
                          >
                            <ChevronsDown className="w-4 h-4 text-zinc-400" />
                            <span>Move to Bottom</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* TAB 3: PRIVATE VAULT */}
      <div className={activeTab === "private" ? "space-y-4" : "hidden"}>
        {myPrivateItems.length === 0 ? (
          <div className="py-20 text-center bg-[#121212]/92 border border-white/[0.08] rounded-2xl p-8 space-y-4">
            <Lock className="w-8 h-8 text-emerald-500/40 mx-auto" />
            <p className="font-display text-sm font-semibold text-white">
              Private vault is empty
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto leading-relaxed">
              Store confidential recommendations securely encrypted with zero-knowledge AES-256 client keys.
            </p>
            <button
              type="button"
              onClick={() => onOpenAddModal?.({ isPrivate: true })}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-black text-xs font-semibold rounded-full transition-all cursor-pointer min-h-[40px]"
            >
              <Plus className="w-4 h-4" />
              <span>Add to Private Vault</span>
            </button>
          </div>
        ) : filteredPrivateItems.length === 0 ? (
          <div className="py-20 text-center bg-[#121212]/92 border border-white/[0.08] rounded-2xl p-8 space-y-4">
            <Search className="w-6 h-6 text-zinc-600 mx-auto" />
            <p className="font-display text-sm font-semibold text-white">
              No private vault items found
            </p>
            <p className="text-xs text-zinc-500 max-w-sm mx-auto">
              {searchQuery?.trim()
                ? `No private items matching "${searchQuery}".`
                : `No private items match the selected filter.`}
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredPrivateItems.map((item) => {
              const isMenuActive = activeMenuId === item.id;
              const isItemWatched = isWatched(item.id);

              return (
                <div
                  key={item.id}
                  draggable={!searchQuery?.trim()}
                  onDragStart={(e) => handleDragStart(e, item.id)}
                  onDragOver={(e) => handleDragOver(e, item.id)}
                  onDrop={(e) => handleDrop(e, "private", item.id)}
                  onDragEnd={handleDragEnd}
                  className={`bg-[#121212]/92 hover:bg-[#171717] border border-white/[0.08] hover:border-white/[0.18] rounded-2xl p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition-all duration-150 taste-card ${
                    isMenuActive ? "relative z-30" : "relative z-0"
                  } ${
                    isItemWatched ? "opacity-50 hover:opacity-75" : "opacity-100"
                  } ${dragOverItemId === item.id ? "border-amber-400/60 shadow-lg" : ""}`}
                >
                  <div className="flex items-start gap-2.5 flex-1 min-w-0">
                    {/* Drag Grip Handle */}
                    <div
                      className="shrink-0 pt-1 text-zinc-600 hover:text-zinc-300 cursor-grab active:cursor-grabbing p-1 transition-colors select-none hidden sm:block"
                      aria-label="Drag to reorder"
                    >
                      <GripVertical className="w-4 h-4" />
                    </div>

                    <div className="flex-1 min-w-0 space-y-1.5">
                      <div className="flex items-center gap-2 flex-wrap text-[11px] font-mono text-zinc-500">
                        <span className={`text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-md font-medium border ${getCategoryBadgeClass(item.category)}`}>
                          {item.category === "other" && item.metadata?.custom_category
                            ? item.metadata.custom_category
                            : CATEGORIES.find((c) => c.id === item.category)?.label || item.category}
                        </span>
                        <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-300 border border-emerald-500/20">
                          <Lock className="w-3 h-3 text-emerald-400" />
                          <span>Private Vault</span>
                        </span>
                        {item.metadata?.year && <span>{item.metadata.year}</span>}
                        {item.metadata?.author && (
                          <span className="truncate">
                            by <strong className="text-zinc-300">{item.metadata.author}</strong>
                          </span>
                        )}
                        {item.metadata?.platform && <span>• {item.metadata.platform}</span>}
                      </div>

                      <h3 className={`font-display font-bold text-sm sm:text-base break-words line-clamp-2 transition-colors duration-75 ${
                        isItemWatched
                          ? "text-zinc-500 line-through decoration-zinc-500/80 decoration-2"
                          : "text-white"
                      }`}>
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
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2 shrink-0 self-stretch sm:self-center justify-between sm:justify-start pt-2 sm:pt-0 border-t border-white/[0.06] sm:border-t-0">
                    {/* Watched Tickbox Button (to the left of Share button) */}
                    <button
                      type="button"
                      onClick={() => toggleWatched(item.id)}
                      className={`flex items-center gap-1.5 px-2.5 sm:px-3 py-2 rounded-xl border text-xs font-medium transition-all active:scale-95 duration-75 cursor-pointer min-h-[40px] select-none ${
                        isItemWatched
                          ? "bg-emerald-500/15 border-emerald-500/35 text-emerald-300"
                          : "bg-white/[0.04] hover:bg-white/[0.08] border-white/[0.1] text-zinc-400 hover:text-zinc-200"
                      }`}
                      aria-label={isItemWatched ? "Mark as unwatched" : "Mark as watched"}
                    >
                      <span
                        className={`w-4 h-4 rounded-md border flex items-center justify-center transition-colors ${
                          isItemWatched
                            ? "bg-emerald-500 border-emerald-400 text-black"
                            : "border-zinc-500 bg-transparent"
                        }`}
                      >
                        {isItemWatched && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <span className="text-[11px] font-mono hidden sm:inline">
                        {isItemWatched ? "Watched" : "Watch"}
                      </span>
                    </button>

                    {/* Share Button */}
                    <button
                      type="button"
                      disabled={!(item._isDecrypted || (item.title && item.title !== "[Encrypted Item]"))}
                      onClick={() => onOpenShare?.(item)}
                      className={`flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors border rounded-xl min-h-[40px] ${
                        !(item._isDecrypted || (item.title && item.title !== "[Encrypted Item]"))
                          ? "bg-white/[0.02] text-zinc-600 border-white/[0.04] cursor-not-allowed"
                          : "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border-white/[0.1] cursor-pointer"
                      }`}
                      aria-label="Share privately with a friend"
                    >
                      <Share2 className="w-3.5 h-3.5 text-zinc-400" />
                      <span className="hidden sm:inline">Share</span>
                    </button>

                    {/* 3-Dots Dropdown Menu */}
                    <div className={`relative ${isMenuActive ? "z-40" : ""}`} data-card-menu>
                      <button
                        type="button"
                        disabled={!(item._isDecrypted || (item.title && item.title !== "[Encrypted Item]"))}
                        onClick={() => setActiveMenuId(isMenuActive ? null : item.id)}
                        className={`p-2.5 border rounded-xl min-h-[40px] flex items-center justify-center transition-colors ${
                          !(item._isDecrypted || (item.title && item.title !== "[Encrypted Item]"))
                            ? "bg-white/[0.02] text-zinc-600 border-white/[0.04] cursor-not-allowed"
                            : "bg-white/[0.06] hover:bg-white/[0.12] text-zinc-300 hover:text-white border-white/[0.1] cursor-pointer"
                        }`}
                        aria-label="More options"
                      >
                        <MoreVertical className="w-4 h-4 text-zinc-400" />
                      </button>

                      {isMenuActive && (
                        <div className="absolute right-0 mt-1.5 w-44 bg-[#141414] border border-white/[0.12] p-1.5 shadow-2xl rounded-2xl z-50 text-xs space-y-1 animate-in fade-in zoom-in-95 duration-100">
                          {/* Move to Top */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              handleMoveToTop("private", item.id);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer min-h-[36px]"
                          >
                            <ChevronsUp className="w-4 h-4 text-amber-400" />
                            <span>Move to Top</span>
                          </button>

                          {/* Move to Bottom */}
                          <button
                            type="button"
                            onClick={() => {
                              setActiveMenuId(null);
                              handleMoveToBottom("private", item.id);
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer min-h-[36px]"
                          >
                            <ChevronsDown className="w-4 h-4 text-zinc-400" />
                            <span>Move to Bottom</span>
                          </button>

                          <div className="border-t border-white/[0.08] pt-1 mt-1">
                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setPrivacyModalItem(item);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-zinc-300 hover:text-white hover:bg-white/[0.06] rounded-xl text-left transition-colors cursor-pointer min-h-[36px]"
                            >
                              <Globe className="w-4 h-4 text-zinc-400" />
                              <span>Make Public</span>
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                setActiveMenuId(null);
                                setDeleteConfirmItem(item);
                              }}
                              className="w-full flex items-center gap-2.5 px-3 py-2 text-rose-400 hover:bg-rose-500/10 rounded-xl text-left transition-colors cursor-pointer min-h-[36px]"
                            >
                              <Trash2 className="w-4 h-4" />
                              <span>Delete</span>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Export Recommendations Modal */}
      <ExportRecsModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        userProfile={profile}
        myItems={getEffectiveList("created")}
        upvotedItems={getEffectiveList("upvoted")}
        myPrivateItems={getEffectiveList("private")}
        onToast={onToast}
      />

      {/* Edit Recommendation Modal */}
      {editingItem && (
        <EditRecommendationModal
          item={editingItem}
          isOpen={Boolean(editingItem)}
          onClose={() => setEditingItem(null)}
          onSuccess={() => setEditingItem(null)}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onMouseDown={(e) => {
            backdropMouseDownRef.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && backdropMouseDownRef.current && !deletingId) {
              setDeleteConfirmItem(null);
            }
            backdropMouseDownRef.current = false;
          }}
        >
          <div
            className="w-full max-w-sm bg-[#121212] border border-white/[0.12] rounded-2xl p-6 shadow-2xl space-y-4 text-white"
            role="dialog"
            aria-modal="true"
            aria-labelledby="delete-dialog-title"
          >
            <div className="space-y-1">
              <h3 id="delete-dialog-title" className="font-display font-bold text-base text-white">
                Delete Recommendation?
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Are you sure you want to delete <strong className="text-zinc-200">"{deleteConfirmItem.title}"</strong>? This action cannot be undone.
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={Boolean(deletingId)}
                onClick={() => handleDelete(deleteConfirmItem.id)}
                className="px-4 py-2 text-xs font-semibold bg-rose-600 hover:bg-rose-500 text-white rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {deletingId ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Privacy Toggle Modal */}
      {privacyModalItem && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150"
          onMouseDown={(e) => {
            backdropMouseDownRef.current = e.target === e.currentTarget;
          }}
          onClick={(e) => {
            if (e.target === e.currentTarget && backdropMouseDownRef.current && !isTogglingPrivacy) {
              setPrivacyModalItem(null);
            }
            backdropMouseDownRef.current = false;
          }}
        >
          <div
            className="w-full max-w-sm bg-[#121212] border border-white/[0.12] rounded-2xl p-6 shadow-2xl space-y-4 text-white"
            role="dialog"
            aria-modal="true"
            aria-labelledby="privacy-dialog-title"
          >
            <div className="space-y-1">
              <h3 id="privacy-dialog-title" className="font-display font-bold text-base text-white flex items-center gap-2">
                {privacyModalItem.is_private ? (
                  <>
                    <Globe className="w-4 h-4 text-amber-400" />
                    <span>Publish to Public Feed?</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4 text-emerald-400" />
                    <span>Move to Private Vault?</span>
                  </>
                )}
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                {privacyModalItem.is_private
                  ? `"${privacyModalItem.title}" will become visible on the public community leaderboard.`
                  : `"${privacyModalItem.title}" will be encrypted with your local AES-256 key and removed from the public leaderboard.`}
              </p>
            </div>
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                disabled={isTogglingPrivacy}
                onClick={() => setPrivacyModalItem(null)}
                className="px-4 py-2 text-xs font-medium text-zinc-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isTogglingPrivacy}
                onClick={handleTogglePrivacyConfirm}
                className="px-4 py-2 text-xs font-semibold bg-white text-black hover:bg-zinc-200 rounded-xl transition-colors cursor-pointer flex items-center gap-1.5"
              >
                {isTogglingPrivacy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                <span>Confirm</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
