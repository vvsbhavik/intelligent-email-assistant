import React from "react";
import {
  Inbox,
  Star,
  Send,
  FileText,
  Archive,
  Trash2,
  PenSquare,
  Activity,
  Sparkles,
  Database,
  BrainCircuit,
  Bot,
  Zap,
} from "lucide-react";
import { FolderType } from "../../types";

interface SidebarProps {
  currentFolder: FolderType;
  currentView: "emails" | "activity";
  onSelectFolder: (folder: FolderType) => void;
  onSelectView: (view: "emails" | "activity") => void;
  onOpenCompose: () => void;
  unreadCount?: number;
  starredCount?: number;
  totalEmails?: number;
  onOpenStatusModal: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({
  currentFolder,
  currentView,
  onSelectFolder,
  onSelectView,
  onOpenCompose,
  unreadCount = 0,
  starredCount = 0,
  onOpenStatusModal,
}) => {
  const folders: { id: FolderType; label: string; icon: React.FC<{ className?: string }>; count?: number }[] = [
    { id: "inbox", label: "Inbox", icon: Inbox, count: unreadCount },
    { id: "starred", label: "Starred", icon: Star, count: starredCount },
    { id: "sent", label: "Sent", icon: Send },
    { id: "drafts", label: "Drafts", icon: FileText },
    { id: "archive", label: "Archive", icon: Archive },
    { id: "trash", label: "Trash", icon: Trash2 },
  ];

  return (
    <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col justify-between p-4 shrink-0 select-none">
      <div className="space-y-6">
        {/* Primary Action: Compose Button */}
        <button
          type="button"
          id="sidebar-compose-btn"
          onClick={onOpenCompose}
          className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 via-indigo-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-sm shadow-lg shadow-sky-500/20 hover:shadow-sky-500/30 flex items-center justify-center gap-2.5 transition-all transform active:scale-[0.99] cursor-pointer"
        >
          <PenSquare className="w-4 h-4" />
          <span>Compose Email</span>
          <Sparkles className="w-3.5 h-3.5 opacity-80" />
        </button>

        {/* Mail Folders */}
        <div className="space-y-1">
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Mailboxes
          </div>
          {folders.map((folder) => {
            const Icon = folder.icon;
            const isActive = currentView === "emails" && currentFolder === folder.id;

            return (
              <button
                key={folder.id}
                type="button"
                id={`folder-nav-${folder.id}`}
                onClick={() => {
                  onSelectView("emails");
                  onSelectFolder(folder.id);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
                  isActive
                    ? "bg-sky-500/15 text-sky-400 font-semibold border border-sky-500/20"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? "text-sky-400" : "text-slate-400"}`} />
                  <span>{folder.label}</span>
                </div>
                {folder.count && folder.count > 0 ? (
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      isActive
                        ? "bg-sky-500 text-white"
                        : "bg-slate-800 text-slate-400 border border-slate-700"
                    }`}
                  >
                    {folder.count}
                  </span>
                ) : null}
              </button>
            );
          })}
        </div>

        {/* Application Data & Insights */}
        <div className="space-y-1 pt-2 border-t border-slate-800/80">
          <div className="px-3 text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-2">
            Data & Audit
          </div>

          <button
            type="button"
            id="nav-activity-log"
            onClick={() => onSelectView("activity")}
            className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-medium transition-all ${
              currentView === "activity"
                ? "bg-indigo-500/15 text-indigo-400 font-semibold border border-indigo-500/20"
                : "text-slate-400 hover:text-slate-200 hover:bg-slate-800/60 border border-transparent"
            }`}
          >
            <div className="flex items-center gap-3">
              <Activity className="w-4 h-4" />
              <span>Activity & DB History</span>
            </div>
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
          </button>
        </div>
      </div>

      {/* AI Assistant Quick Card & System Status */}
      <div className="space-y-3 pt-4 border-t border-slate-800">
        <div className="p-3 bg-gradient-to-br from-slate-850 to-slate-800 rounded-2xl border border-slate-750">
          <div className="flex items-center gap-2 mb-1.5">
            <div className="p-1 rounded-lg bg-sky-500/20 text-sky-400">
              <Bot className="w-3.5 h-3.5" />
            </div>
            <span className="text-xs font-bold text-slate-200">Gemini 3.7 AI</span>
          </div>
          <p className="text-[11px] text-slate-400 leading-relaxed">
            Neural summarization, tone fine-tuning, and priority detection enabled.
          </p>
        </div>

        <button
          type="button"
          id="sidebar-setup-guide"
          onClick={onOpenStatusModal}
          className="w-full py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-750 border border-slate-700/80 text-slate-400 hover:text-slate-200 text-xs font-medium flex items-center justify-between transition-colors"
        >
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-indigo-400" />
            <span>Supabase & Stack</span>
          </div>
          <span className="text-[10px] bg-slate-700/50 px-1.5 py-0.5 rounded text-slate-300">Docs</span>
        </button>
      </div>
    </aside>
  );
};
