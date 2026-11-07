import React, { useState, useMemo } from "react";
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
} from "lucide-react";
import { useItems } from "../context/ItemContext";
import { CATEGORIES } from "../constants/categories";
import { getSafeExternalLink } from "../lib/avatar";
import CategoryFilter from "./CategoryFilter";
import EditRecommendationModal from "./EditRecommendationModal";

// Category badge color lookup matching community leaderboard styling
function getCategoryBadgeClass(category) {
  switch (category) {
    case 'movie':
      return 'bg-amber-50 text-amber-900 border-amber-200/80';
    case 'anime':
      return 'bg-indigo-50 text-indigo-900 border-indigo-200/80';
    case 'book':
      return 'bg-emerald-50 text-emerald-900 border-emerald-200/80';
    case 'game':
      return 'bg-rose-50 text-rose-900 border-rose-200/80';
    case 'yt':
    case 'webseries':
      return 'bg-orange-50 text-orange-900 border-orange-200/80';
    case 'app':
    case 'other':
    default:
      return 'bg-stone-100 text-stone-800 border-stone-200/90';
  }
}

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
  } = useItems();

  // Active sub-tab ('created' | 'private' | 'upvoted')
  const [activeTab, setActiveTab] = useState("created");
  const [createdCategory, setCreatedCategory] = useState("all");
  const [vaultCategory, setVaultCategory] = useState("all");
  const [editingItem, setEditingItem] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirmItem, setDeleteConfirmItem] = useState(null);
  const [privacyModalItem, setPrivacyModalItem] = useState(null);
  const [isTogglingPrivacy, setIsTogglingPrivacy] = useState(false);
  const [errorMessage, setErrorMessage] = useState(null);

  // Filter created public items by category and search query
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

    return result;
  }, [myItems, createdCategory, searchQuery]);

  // Filter upvoted items by search query
  const filteredUpvotedItems = useMemo(() => {
    if (!searchQuery?.trim()) return upvotedItems;
    const q = searchQuery.trim().toLowerCase();
    return upvotedItems.filter((item) => {
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
  }, [upvotedItems, searchQuery]);

  // Filter private vault items by category and search query
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
    <div className="space-y-5">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 pb-3 border-b border-stone-200">
        <div>
          <h2 className="font-display text-lg sm:text-xl font-bold tracking-tight text-zinc-950 flex items-center gap-2">
            <Bookmark className="w-5 h-5 text-emerald-600" />
            My Recom  mendations
          </h2>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 self-start sm:self-auto">
          <button
            type="button"
            onClick={() =>
              onOpenAddModal?.({ isPrivate: activeTab === "private" })
            }
            className="flex items-center gap-1.5 px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Rec</span>
          </button>
        </div>
      </div>

      {/* Error Alert */}
      {errorMessage && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-center justify-between gap-2 animate-in fade-in duration-150">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
          <button
            type="button"
            onClick={() => setErrorMessage(null)}
            className="text-rose-700 hover:text-rose-900 text-xs px-2 py-0.5 hover:bg-rose-100 rounded transition-colors cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Vault Error Notice */}
      {vaultError && (
        <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl flex items-center gap-2 text-xs text-rose-800">
          <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
          <span>Vault notice: {vaultError}</span>
        </div>
      )}

      {/* 3 Tabs: Created, Private Vault, Upvoted */}
      <div className="flex border-b border-stone-200 gap-4 sm:gap-6 overflow-x-auto">
        <button
          type="button"
          onClick={() => setActiveTab("created")}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "created"
              ? "border-zinc-950 text-zinc-950"
              : "border-transparent text-stone-500 hover:text-zinc-900"
          }`}
        >
          <span>Created (Public)</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700">
            {createdCategory !== "all" || searchQuery?.trim()
              ? `${filteredCreatedItems.length}/${myItems.length}`
              : myItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("upvoted")}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "upvoted"
              ? "border-zinc-950 text-zinc-950"
              : "border-transparent text-stone-500 hover:text-zinc-900"
          }`}
        >
          <span>Upvoted</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-stone-100 text-stone-700">
            {searchQuery?.trim() ? `${filteredUpvotedItems.length}/${upvotedItems.length}` : upvotedItems.length}
          </span>
        </button>

        <button
          type="button"
          onClick={() => setActiveTab("private")}
          className={`pb-2.5 text-xs font-semibold flex items-center gap-2 border-b-2 transition-all cursor-pointer whitespace-nowrap ${
            activeTab === "private"
              ? "border-zinc-950 text-zinc-950"
              : "border-transparent text-stone-500 hover:text-zinc-900"
          }`}
        >
          <Lock className="w-3.5 h-3.5 text-emerald-700" />
          <span>Private Vault</span>
          <span className="font-mono text-[10px] px-1.5 py-0.5 rounded-md bg-emerald-50 text-emerald-800 font-bold border border-emerald-200/60">
            {vaultCategory !== "all" || searchQuery?.trim()
              ? `${filteredPrivateItems.length}/${myPrivateItems.length}`
              : myPrivateItems.length}
          </span>
        </button>
      </div>

      {/* TAB 1: CREATED (PUBLIC) ITEMS */}
      {activeTab === "created" && (
        <div className="space-y-4">
          {/* Category Filter Chips matching Community Leaderboard */}
          <CategoryFilter
            selectedCategory={createdCategory}
            onSelectCategory={setCreatedCategory}
          />

          {myItems.length === 0 ? (
            <div className="py-16 text-center bg-white border border-stone-200 rounded-2xl p-8 space-y-3 shadow-xs">
              <Bookmark className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="font-display text-sm font-bold text-zinc-950">
                You haven't added any public recommendations yet
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Recommend your favorite movies, anime, books, or YouTube channels
                to put them on the global leaderboard.
              </p>
              <button
                type="button"
                onClick={() =>
                  onOpenAddModal?.({
                    isPrivate: false,
                    category: createdCategory !== "all" ? createdCategory : "movie",
                  })
                }
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Your First Recommendation</span>
              </button>
            </div>
          ) : filteredCreatedItems.length === 0 ? (
            <div className="py-16 text-center bg-white border border-stone-200 rounded-2xl p-8 space-y-3 shadow-xs">
              <Search className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="font-display text-sm font-bold text-zinc-950">
                No recommendations found
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {searchQuery?.trim()
                  ? `No public recommendations matching "${searchQuery}".`
                  : `You haven't added any public recommendations in "${CATEGORIES.find((c) => c.id === createdCategory)?.label || createdCategory}" yet.`}
              </p>
              {createdCategory !== "all" && (
                <button
                  type="button"
                  onClick={() => setCreatedCategory("all")}
                  className="mt-2 px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
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
                  className="bg-white hover:bg-white border border-stone-200/90 hover:border-stone-300 rounded-2xl p-3.5 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all duration-150 shadow-xs hover:shadow-md"
                >
                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full font-semibold border ${getCategoryBadgeClass(item.category)}`}>
                        {item.category === "other" &&
                        item.metadata?.custom_category
                          ? item.metadata.custom_category
                          : CATEGORIES.find((c) => c.id === item.category)
                              ?.label || item.category}
                      </span>
                    {item.metadata?.year && (
                      <span className="text-xs font-mono text-stone-500">
                        {item.metadata.year}
                      </span>
                    )}
                    {item.metadata?.author && (
                      <span className="text-xs text-stone-600 truncate">
                        by {item.metadata.author}
                      </span>
                    )}
                    {item.metadata?.platform && (
                      <span className="text-xs text-stone-500">
                        • {item.metadata.platform}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display font-bold text-sm sm:text-base text-zinc-950 break-words line-clamp-2">
                    {item.title}
                  </h3>

                  {item.metadata?.note && (
                    <p className="text-xs text-stone-600 mt-1.5 line-clamp-2 leading-relaxed border-l-2 border-stone-200 pl-2.5 italic">
                      "{item.metadata.note}"
                    </p>
                  )}

                  {getSafeExternalLink(item.metadata?.channel_link) && (
                    <a
                      href={getSafeExternalLink(item.metadata.channel_link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-600 hover:text-[#2D6A4F] mt-1.5 transition-colors"
                    >
                      <span>Visit Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Vote Count & Action Buttons */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-stretch sm:self-center justify-between sm:justify-start pt-2 sm:pt-0 border-t border-stone-100 sm:border-t-0">
                  <div className="flex items-center gap-1.5 bg-stone-50 border border-stone-200 rounded-xl px-2.5 sm:px-3 py-1.5 text-xs font-mono text-stone-700">
                    <ArrowBigUp className="w-4 h-4 fill-emerald-600 stroke-emerald-600" />
                    <span className="font-bold">{item.recommend_count}</span>
                    <span className="text-stone-400 text-[11px]">votes</span>
                  </div>

                  <div className="flex items-center gap-1.5 sm:gap-2">
                    <button
                      type="button"
                      onClick={() => setPrivacyModalItem(item)}
                      className="flex items-center gap-1 px-2.5 py-1.5 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors border border-stone-200 rounded-xl shadow-xs cursor-pointer"
                      title="Move to Private Vault (E2EE)"
                    >
                      <Lock className="w-3.5 h-3.5 text-stone-500" />
                      <span className="hidden sm:inline">Make Private</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditingItem(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 text-stone-700 text-xs font-medium transition-colors border border-stone-200 rounded-xl shadow-xs cursor-pointer"
                      title="Edit recommendation details"
                    >
                      <Edit3 className="w-3.5 h-3.5 text-stone-400" />
                      <span>Edit</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setDeleteConfirmItem(item)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium transition-colors border border-rose-200 rounded-xl cursor-pointer"
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
    )}

      {/* TAB 2: PRIVATE E2EE VAULT ITEMS */}
      {activeTab === "private" && (
        <div className="space-y-4">
          {/* Category Filter Chips */}
          <CategoryFilter
            selectedCategory={vaultCategory}
            onSelectCategory={setVaultCategory}
          />

          {myPrivateItems.length === 0 ? (
            <div className="py-16 text-center bg-white border border-stone-200 rounded-2xl p-8 space-y-3 shadow-xs">
              <Lock className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="font-display text-sm font-bold text-zinc-950">
                Your private vault is empty
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                Save your guilty pleasures or private watchlist items.
              </p>
              <button
                type="button"
                onClick={() =>
                  onOpenAddModal?.({
                    isPrivate: true,
                    category: vaultCategory !== "all" ? vaultCategory : "movie",
                  })
                }
                className="mt-2 inline-flex items-center gap-1.5 px-4 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Private Recommendation</span>
              </button>
            </div>
          ) : filteredPrivateItems.length === 0 ? (
            <div className="py-16 text-center bg-white border border-stone-200 rounded-2xl p-8 space-y-3 shadow-xs">
              <Search className="w-8 h-8 text-stone-400 mx-auto" />
              <p className="font-display text-sm font-bold text-zinc-950">
                No private recommendations found
              </p>
              <p className="text-xs text-stone-500 max-w-sm mx-auto">
                {searchQuery?.trim()
                  ? `No private items matching "${searchQuery}" in this category.`
                  : `You haven't added any private recommendations in "${CATEGORIES.find((c) => c.id === vaultCategory)?.label || vaultCategory}" yet.`}
              </p>
              <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
                {vaultCategory !== "all" && (
                  <button
                    type="button"
                    onClick={() => setVaultCategory("all")}
                    className="px-3.5 py-2 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors cursor-pointer"
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
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-zinc-950 hover:bg-zinc-800 text-white text-xs font-semibold rounded-xl transition-all shadow-xs cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>
                    Add in{" "}
                    {vaultCategory !== "all"
                      ? CATEGORIES.find((c) => c.id === vaultCategory)?.label || "Category"
                      : "Private Vault"}
                  </span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredPrivateItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-emerald-900/10 hover:border-emerald-700/30 rounded-2xl p-3.5 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all duration-150 shadow-xs hover:shadow-md"
                >
                  {/* Item Info */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                      <span className={`text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full font-semibold border ${getCategoryBadgeClass(item.category)}`}>
                        {item.category === "other" &&
                        item.metadata?.custom_category
                          ? item.metadata.custom_category
                          : CATEGORIES.find((c) => c.id === item.category)
                              ?.label || item.category}
                      </span>
                      <span className="inline-flex items-center gap-1 text-[10px] font-mono px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-full font-semibold">
                        <Lock className="w-3 h-3 text-emerald-700" />
                        <span>E2EE Private</span>
                      </span>
                      {item.metadata?.year && (
                        <span className="text-xs font-mono text-stone-500">
                          {item.metadata.year}
                        </span>
                      )}
                      {item.metadata?.author && (
                        <span className="text-xs text-stone-600 truncate">
                          by {item.metadata.author}
                        </span>
                      )}
                      {item.metadata?.platform && (
                        <span className="text-xs text-stone-500">
                          • {item.metadata.platform}
                        </span>
                      )}
                    </div>

                    <h3 className="font-display font-bold text-sm sm:text-base text-zinc-950 break-words line-clamp-2">
                      {item._isDecrypted ||
                      (item.title && item.title !== "[Encrypted Item]") ? (
                        item.title
                      ) : item._decryptionFailed || vaultError ? (
                        <span className="inline-flex items-center gap-1.5 text-stone-500 font-mono text-xs bg-stone-100 px-2 py-0.5 rounded-md border border-stone-200">
                          <Lock className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                          <span>Encrypted</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1.5 text-stone-400 font-mono text-xs">
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-stone-400 shrink-0" />
                          <span>Decrypting...</span>
                        </span>
                      )}
                    </h3>

                    {item.metadata?.note && (
                      <p className="text-xs text-stone-600 mt-1.5 line-clamp-2 leading-relaxed border-l-2 border-emerald-200 pl-2.5 italic">
                        "{item.metadata.note}"
                      </p>
                    )}

                    {getSafeExternalLink(item.metadata?.channel_link) && (
                      <a
                        href={getSafeExternalLink(item.metadata.channel_link)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-600 hover:text-[#2D6A4F] mt-1.5 transition-colors"
                      >
                        <span>Visit Link</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-stretch sm:self-center justify-between sm:justify-start pt-2 sm:pt-0 border-t border-stone-100 sm:border-t-0">
                    <div className="flex items-center gap-1.5 sm:gap-2">
                      <button
                        type="button"
                        disabled={!item._isDecrypted}
                        onClick={() => setPrivacyModalItem(item)}
                        className={`flex items-center gap-1 px-3 py-1.5 text-xs font-medium transition-colors border rounded-xl shadow-xs ${
                          !item._isDecrypted
                            ? "bg-stone-50 text-stone-300 border-stone-200 cursor-not-allowed"
                            : "bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border-emerald-200 cursor-pointer"
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
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border rounded-xl shadow-xs ${
                          !item._isDecrypted
                            ? "bg-stone-50 text-stone-300 border-stone-200 cursor-not-allowed"
                            : "bg-white hover:bg-stone-50 text-stone-700 border-stone-200 cursor-pointer"
                        }`}
                        title={
                          !item._isDecrypted
                            ? "Cannot edit until decrypted"
                            : "Edit recommendation details"
                        }
                      >
                        <Edit3 className="w-3.5 h-3.5 text-stone-400" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setDeleteConfirmItem(item)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 text-xs font-medium transition-colors border border-rose-200 rounded-xl cursor-pointer"
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
      )}

      {/* TAB 3: UPVOTED ITEMS */}
      {activeTab === "upvoted" && (
        <div className="space-y-4">
          {upvotedItems.length === 0 ? (
          <div className="py-16 text-center bg-white border border-stone-200 rounded-2xl p-8 space-y-3 shadow-xs">
            <Heart className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="font-display text-sm font-bold text-zinc-950">
              No upvoted recommendations yet
            </p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              Browse the community leaderboard and upvote things you love to
              build this list.
            </p>
          </div>
        ) : filteredUpvotedItems.length === 0 ? (
          <div className="py-16 text-center bg-white border border-stone-200 rounded-2xl p-8 space-y-3 shadow-xs">
            <Search className="w-8 h-8 text-stone-400 mx-auto" />
            <p className="font-display text-sm font-bold text-zinc-950">
              No upvoted recommendations found
            </p>
            <p className="text-xs text-stone-500 max-w-sm mx-auto">
              No upvoted items matching "{searchQuery}".
            </p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredUpvotedItems.map((item) => (
              <div
                key={item.id}
                className="bg-white hover:bg-white border border-stone-200/90 hover:border-stone-300 rounded-2xl p-3.5 sm:p-4.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4 transition-all duration-150 shadow-xs hover:shadow-md"
              >
                {/* Item Info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1.5 flex-wrap">
                    <span className={`text-[10px] uppercase font-mono tracking-wider px-2 py-0.5 rounded-full font-semibold border ${getCategoryBadgeClass(item.category)}`}>
                      {item.category === "other" &&
                      item.metadata?.custom_category
                        ? item.metadata.custom_category
                        : CATEGORIES.find((c) => c.id === item.category)
                            ?.label || item.category}
                    </span>
                    {item.metadata?.year && (
                      <span className="text-xs font-mono text-stone-500">
                        {item.metadata.year}
                      </span>
                    )}
                    {item.metadata?.author && (
                      <span className="text-xs text-stone-600 truncate">
                        by {item.metadata.author}
                      </span>
                    )}
                    {item.metadata?.platform && (
                      <span className="text-xs text-stone-500">
                        • {item.metadata.platform}
                      </span>
                    )}
                  </div>

                  <h3 className="font-display font-bold text-sm sm:text-base text-zinc-950 break-words line-clamp-2">
                    {item.title}
                  </h3>

                  {item.metadata?.note && (
                    <p className="text-xs text-stone-600 mt-1.5 line-clamp-2 leading-relaxed border-l-2 border-stone-200 pl-2.5 italic">
                      "{item.metadata.note}"
                    </p>
                  )}

                  {getSafeExternalLink(item.metadata?.channel_link) && (
                    <a
                      href={getSafeExternalLink(item.metadata.channel_link)}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] font-mono text-stone-600 hover:text-[#2D6A4F] mt-1.5 transition-colors"
                    >
                      <span>Visit Link</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>

                {/* Vote Action */}
                <div className="flex items-center gap-2 sm:gap-3 shrink-0 self-stretch sm:self-center justify-between sm:justify-start pt-2 sm:pt-0 border-t border-stone-100 sm:border-t-0">
                  <button
                    type="button"
                    onClick={() => toggleRecommend(item.id)}
                    className="flex items-center gap-2 px-3 py-2 bg-emerald-50 hover:bg-rose-50 border border-emerald-200 hover:border-rose-200 text-emerald-700 hover:text-rose-700 text-xs font-mono rounded-xl transition-colors group cursor-pointer"
                    title="Click to remove upvote"
                  >
                    <ArrowBigUp className="w-4 h-4 fill-emerald-600 stroke-emerald-600 group-hover:fill-rose-600 group-hover:stroke-rose-600" />
                    <span className="font-bold">{item.recommend_count}</span>
                    <span className="text-[11px] group-hover:hidden">
                      Upvoted
                    </span>
                    <span className="text-[11px] hidden group-hover:inline">
                      Remove
                    </span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    )}

      {/* Privacy Toggle Confirmation Modal */}
      {privacyModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 space-y-4 border border-stone-200 shadow-xl animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-stone-100 flex items-center justify-center shrink-0">
                {privacyModalItem.is_private ? (
                  <Globe className="w-5 h-5 text-emerald-700" />
                ) : (
                  <Lock className="w-5 h-5 text-emerald-700" />
                )}
              </div>
              <div>
                <h3 className="font-display font-bold text-base text-zinc-950">
                  {privacyModalItem.is_private
                    ? "Make Recommendation Public?"
                    : "Move to Private Vault?"}
                </h3>
                <p className="text-xs text-stone-500 mt-0.5">
                  "{privacyModalItem.title}"
                </p>
              </div>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              {privacyModalItem.is_private ? (
                <>
                  This recommendation will be published to the{" "}
                  <strong>global community leaderboard</strong> with your
                  username as the creator.
                </>
              ) : (
                <>This recommendation will be removed from the public feed.</>
              )}
            </p>

            <div className="flex items-center justify-end gap-3 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setPrivacyModalItem(null)}
                disabled={isTogglingPrivacy}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:text-stone-900 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleTogglePrivacyConfirm}
                disabled={isTogglingPrivacy}
                className="px-4 py-2 text-xs font-semibold bg-zinc-950 hover:bg-zinc-800 text-white rounded-xl shadow-xs transition-colors cursor-pointer disabled:opacity-50 inline-flex items-center gap-1.5"
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-stone-900/40 backdrop-blur-xs">
          <div className="w-full max-w-md bg-white border border-stone-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center gap-3 text-rose-700">
              <div className="p-2 bg-rose-50 border border-rose-200 rounded-xl">
                <Trash2 className="w-5 h-5 text-rose-600" />
              </div>
              <h3 className="font-display font-bold text-base text-zinc-950">
                Delete Recommendation
              </h3>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Are you sure you want to permanently delete{" "}
              <strong>"{deleteConfirmItem.title}"</strong>? This will remove it
              from the platform globally.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setDeleteConfirmItem(null)}
                className="px-4 py-2 text-xs font-medium text-stone-600 hover:text-zinc-950 hover:bg-stone-100 rounded-xl transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={deletingId === deleteConfirmItem.id}
                onClick={() => handleDelete(deleteConfirmItem.id)}
                className="px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold rounded-xl transition-colors disabled:opacity-50 shadow-xs cursor-pointer"
              >
                {deletingId === deleteConfirmItem.id
                  ? "Deleting..."
                  : "Yes, Delete Globally"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
