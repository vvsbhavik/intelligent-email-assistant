import React, { useState } from "react";
import {
  Search,
  Sparkles,
  RefreshCw,
  SlidersHorizontal,
  LogOut,
  Database,
  ShieldCheck,
  ChevronDown,
  Mail,
  Zap,
  Info,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";

interface NavbarProps {
  searchQuery: string;
  onSearchChange: (q: string) => void;
  unreadOnly: boolean;
  onToggleUnread: () => void;
  starredOnly: boolean;
  onToggleStarred: () => void;
  onRefresh: () => void;
  isRefreshing: boolean;
  onOpenStatusModal: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  searchQuery,
  onSearchChange,
  unreadOnly,
  onToggleUnread,
  starredOnly,
  onToggleStarred,
  onRefresh,
  isRefreshing,
  onOpenStatusModal,
}) => {
  const { user, isDemo, isRealGoogleConnected, logout, systemStatus } = useAuth();
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const [isAiSearching, setIsAiSearching] = useState(false);
  const [aiSearchPrompt, setAiSearchPrompt] = useState("");
  const [showAiSearchTooltip, setShowAiSearchTooltip] = useState(false);

  const handleAiSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!aiSearchPrompt.trim()) return;

    setIsAiSearching(true);
    try {
      const res = await api.smartSearch(aiSearchPrompt);
      onSearchChange(res.gmailQuery);
      setAiSearchPrompt("");
    } catch (err) {
      console.error("AI Search Error:", err);
    } finally {
      setIsAiSearching(false);
    }
  };

  return (
    <header className="h-16 bg-slate-900 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between gap-4 select-none shrink-0 z-30">
      {/* Brand & Logo */}
      <div className="flex items-center gap-3 min-w-[200px]">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-md shadow-sky-500/20 text-white">
          <Mail className="w-5 h-5" />
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <h1 className="font-bold text-slate-100 text-sm tracking-tight">Intelligent Email</h1>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sparkles className="w-2.5 h-2.5 mr-0.5" /> AI
            </span>
          </div>
          <p className="text-[11px] text-slate-400 font-medium">Assistant & Gmail Hub</p>
        </div>
      </div>

      {/* Center: Search & Smart Query Bar */}
      <div className="flex-1 max-w-2xl relative">
        <form onSubmit={handleAiSearch} className="relative flex items-center">
          <div className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
            {isAiSearching ? (
              <RefreshCw className="w-4 h-4 animate-spin text-sky-400" />
            ) : (
              <Search className="w-4 h-4" />
            )}
          </div>

          <input
            type="text"
            id="global-email-search"
            value={aiSearchPrompt ? aiSearchPrompt : searchQuery}
            onChange={(e) => {
              if (aiSearchPrompt) {
                setAiSearchPrompt(e.target.value);
              } else {
                onSearchChange(e.target.value);
              }
            }}
            placeholder="Search emails or ask Gemini (e.g., 'unread invoices from last week')..."
            className="w-full pl-10 pr-24 py-2 bg-slate-800/80 hover:bg-slate-800 focus:bg-slate-800 border border-slate-700/80 focus:border-sky-500/80 rounded-xl text-xs md:text-sm text-slate-200 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-500/20 transition-all"
          />

          <div className="absolute right-2 flex items-center gap-1">
            <button
              type="button"
              id="ai-smart-search-btn"
              onClick={() => {
                if (searchQuery && !aiSearchPrompt) {
                  setAiSearchPrompt(searchQuery);
                }
              }}
              className="px-2 py-1 rounded-lg text-[11px] font-medium bg-sky-500/10 text-sky-300 hover:bg-sky-500/20 border border-sky-500/20 transition-colors flex items-center gap-1"
              title="Transform plain English to Gmail search query using Gemini"
            >
              <Sparkles className="w-3 h-3 text-sky-400" />
              <span>Smart Search</span>
            </button>
          </div>
        </form>
      </div>

      {/* Right Controls: Filters, Refresh, System Status, User Avatar */}
      <div className="flex items-center gap-2">
        {/* Quick Filter Buttons */}
        <div className="hidden lg:flex items-center gap-1 bg-slate-800/60 p-1 rounded-xl border border-slate-700/60">
          <button
            type="button"
            id="filter-unread-toggle"
            onClick={onToggleUnread}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              unreadOnly
                ? "bg-sky-500 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            }`}
          >
            Unread
          </button>
          <button
            type="button"
            id="filter-starred-toggle"
            onClick={onToggleStarred}
            className={`px-2.5 py-1 rounded-lg text-xs font-medium transition-all ${
              starredOnly
                ? "bg-amber-500 text-white shadow-sm"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-700/50"
            }`}
          >
            Starred
          </button>
        </div>

        {/* Refresh button */}
        <button
          type="button"
          id="refresh-emails-btn"
          onClick={onRefresh}
          disabled={isRefreshing}
          className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors disabled:opacity-50"
          title="Refresh Inbox"
        >
          <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin text-sky-400" : ""}`} />
        </button>

        {/* System & Architecture Status Pill */}
        <button
          type="button"
          id="system-status-btn"
          onClick={onOpenStatusModal}
          className="hidden sm:flex items-center gap-1.5 px-2.5 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 rounded-xl text-xs text-slate-300 hover:text-white transition-colors"
          title="View Tech Stack & Deployment Setup (Supabase, Gemini, OAuth, Render, Vercel)"
        >
          {isRealGoogleConnected ? (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          ) : (
            <span className="w-2 h-2 rounded-full bg-amber-400" />
          )}
          <span className="font-medium text-[11px]">
            {isRealGoogleConnected ? "Gmail Live" : isDemo ? "Sandbox Demo" : "Setup Guide"}
          </span>
          <Info className="w-3.5 h-3.5 text-slate-400 ml-0.5" />
        </button>

        {/* User Profile Dropdown */}
        <div className="relative">
          <button
            type="button"
            id="user-profile-menu-btn"
            onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
            className="flex items-center gap-2 p-1.5 rounded-xl hover:bg-slate-800 transition-colors border border-transparent hover:border-slate-700"
          >
            {user?.picture ? (
              <img
                src={user.picture}
                alt={user.name || "User"}
                className="w-8 h-8 rounded-lg object-cover ring-1 ring-slate-700"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-lg bg-sky-600/20 border border-sky-500/30 text-sky-300 flex items-center justify-center font-bold text-xs">
                {user?.name ? user.name.slice(0, 2).toUpperCase() : "US"}
              </div>
            )}
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 hidden sm:block" />
          </button>

          {profileDropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setProfileDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-64 bg-slate-850 border border-slate-700 rounded-2xl shadow-xl p-3 z-50 text-slate-200">
                <div className="px-2 py-2 border-b border-slate-750 mb-2">
                  <div className="font-semibold text-sm text-slate-100 truncate">{user?.name || "User"}</div>
                  <div className="text-xs text-slate-400 truncate">{user?.email || "user@example.com"}</div>
                  <div className="mt-1.5 flex items-center gap-1 text-[11px] text-sky-400">
                    <ShieldCheck className="w-3 h-3" />
                    <span>{isRealGoogleConnected ? "Google OAuth 2.0 Active" : "Demo Session"}</span>
                  </div>
                </div>

                <div className="space-y-1">
                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      onOpenStatusModal();
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-slate-800 text-slate-300 flex items-center gap-2 transition-colors"
                  >
                    <Database className="w-3.5 h-3.5 text-slate-400" />
                    <span>Supabase & Deployment Setup</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      setProfileDropdownOpen(false);
                      logout();
                    }}
                    className="w-full text-left px-3 py-2 text-xs rounded-xl hover:bg-rose-500/10 text-rose-400 flex items-center gap-2 transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5 text-rose-400" />
                    <span>Sign Out</span>
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
