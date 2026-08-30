import React from "react";
import {
  Star,
  Mail,
  MailOpen,
  Archive,
  Trash2,
  Paperclip,
  Clock,
  Sparkles,
  AlertCircle,
  Inbox,
  CheckSquare,
  Square,
  RefreshCw,
} from "lucide-react";
import { EmailMessage, FolderType } from "../../types";

interface EmailListProps {
  emails: EmailMessage[];
  selectedEmailId: string | null;
  onSelectEmail: (email: EmailMessage) => void;
  onToggleStar: (email: EmailMessage, e: React.MouseEvent) => void;
  onToggleRead: (email: EmailMessage, e: React.MouseEvent) => void;
  onArchive: (email: EmailMessage, e: React.MouseEvent) => void;
  onTrash: (email: EmailMessage, e: React.MouseEvent) => void;
  currentFolder: FolderType;
  isLoading: boolean;
  selectedIds: string[];
  onToggleSelectId: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  onBatchAction: (action: "read" | "unread" | "archive" | "trash") => void;
}

export const EmailList: React.FC<EmailListProps> = ({
  emails,
  selectedEmailId,
  onSelectEmail,
  onToggleStar,
  onToggleRead,
  onArchive,
  onTrash,
  currentFolder,
  isLoading,
  selectedIds,
  onToggleSelectId,
  onSelectAll,
  onClearSelection,
  onBatchAction,
}) => {
  const allSelected = emails.length > 0 && selectedIds.length === emails.length;
  const isAnySelected = selectedIds.length > 0;

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const now = new Date();
      const isToday = d.toDateString() === now.toDateString();
      if (isToday) {
        return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
      }
      return d.toLocaleDateString([], { month: "short", day: "numeric" });
    } catch {
      return dateStr;
    }
  };

  const getPriorityBadge = (priority?: string) => {
    if (priority === "high") {
      return (
        <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-500/15 text-rose-400 border border-rose-500/20">
          <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
          High
        </span>
      );
    }
    if (priority === "medium") {
      return (
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium bg-amber-500/10 text-amber-400 border border-amber-500/20">
          Med
        </span>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
      {/* Top Action Toolbar */}
      <div className="h-12 border-b border-slate-800 px-4 flex items-center justify-between gap-4 bg-slate-900/90 backdrop-blur shrink-0 select-none">
        <div className="flex items-center gap-3">
          {/* Select All Checkbox */}
          <button
            type="button"
            id="batch-select-all-btn"
            onClick={allSelected ? onClearSelection : onSelectAll}
            className="text-slate-400 hover:text-slate-200 transition-colors"
            title={allSelected ? "Deselect all" : "Select all"}
          >
            {allSelected ? (
              <CheckSquare className="w-4 h-4 text-sky-400" />
            ) : isAnySelected ? (
              <div className="w-4 h-4 rounded border border-sky-400 bg-sky-400/20 flex items-center justify-center">
                <span className="w-2 h-0.5 bg-sky-400 rounded" />
              </div>
            ) : (
              <Square className="w-4 h-4" />
            )}
          </button>

          {isAnySelected ? (
            <div className="flex items-center gap-1">
              <span className="text-xs text-slate-300 font-medium mr-2">
                {selectedIds.length} selected
              </span>
              <button
                type="button"
                id="batch-mark-read-btn"
                onClick={() => onBatchAction("read")}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1 transition-colors"
                title="Mark Read"
              >
                <MailOpen className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id="batch-mark-unread-btn"
                onClick={() => onBatchAction("unread")}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1 transition-colors"
                title="Mark Unread"
              >
                <Mail className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id="batch-archive-btn"
                onClick={() => onBatchAction("archive")}
                className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg text-xs flex items-center gap-1 transition-colors"
                title="Archive"
              >
                <Archive className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                id="batch-trash-btn"
                onClick={() => onBatchAction("trash")}
                className="p-1.5 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 rounded-lg text-xs flex items-center gap-1 transition-colors"
                title="Trash"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          ) : (
            <div className="text-xs font-semibold text-slate-400 capitalize flex items-center gap-2">
              <span>{currentFolder}</span>
              <span className="text-[11px] text-slate-400 font-normal">
                ({emails.length} {emails.length === 1 ? "message" : "messages"})
              </span>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400">
          <Sparkles className="w-3.5 h-3.5 text-sky-400" />
          <span className="hidden sm:inline">AI Smart Inbox</span>
        </div>
      </div>

      {/* Email List Body */}
      <div className="flex-1 overflow-y-auto divide-y divide-slate-800/60">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1, 2, 3, 4, 5].map((n) => (
              <div key={n} className="flex items-center gap-4 animate-pulse">
                <div className="w-4 h-4 bg-slate-800 rounded" />
                <div className="w-4 h-4 bg-slate-800 rounded" />
                <div className="w-28 h-4 bg-slate-800 rounded" />
                <div className="flex-1 h-4 bg-slate-800 rounded" />
                <div className="w-16 h-4 bg-slate-800 rounded" />
              </div>
            ))}
          </div>
        ) : emails.length === 0 ? (
          <div className="flex flex-col items-center justify-center h-72 text-center p-6 text-slate-400">
            <div className="w-12 h-12 rounded-2xl bg-slate-800/80 border border-slate-750 flex items-center justify-center text-slate-400 mb-3">
              <Inbox className="w-6 h-6" />
            </div>
            <h3 className="text-sm font-semibold text-slate-300">No emails in {currentFolder}</h3>
            <p className="text-xs text-slate-400 mt-1 max-w-sm">
              Your inbox is clear or no emails matched your search query.
            </p>
          </div>
        ) : (
          emails.map((email) => {
            const isSelected = selectedEmailId === email.id;
            const isChecked = selectedIds.includes(email.id);

            return (
              <div
                key={email.id}
                id={`email-row-${email.id}`}
                onClick={() => onSelectEmail(email)}
                className={`group flex items-center gap-3 px-4 py-3 hover:bg-slate-800/70 transition-colors cursor-pointer relative ${
                  isSelected ? "bg-sky-500/10 hover:bg-sky-500/15" : ""
                } ${!email.isRead ? "bg-slate-850/40" : ""}`}
              >
                {/* Unread Accent Indicator */}
                {!email.isRead && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-7 bg-sky-500 rounded-r" />
                )}

                {/* Checkbox */}
                <div
                  onClick={(e) => {
                    e.stopPropagation();
                    onToggleSelectId(email.id);
                  }}
                  className="text-slate-400 hover:text-slate-200"
                >
                  {isChecked ? (
                    <CheckSquare className="w-4 h-4 text-sky-400" />
                  ) : (
                    <Square className="w-4 h-4 opacity-60 group-hover:opacity-100" />
                  )}
                </div>

                {/* Star Toggle */}
                <button
                  type="button"
                  id={`star-btn-${email.id}`}
                  onClick={(e) => onToggleStar(email, e)}
                  className={`p-1 rounded-lg transition-colors ${
                    email.isStarred
                      ? "text-amber-400 hover:text-amber-300"
                      : "text-slate-400 hover:text-amber-400 opacity-60 group-hover:opacity-100"
                  }`}
                  title={email.isStarred ? "Unstar" : "Star"}
                >
                  <Star
                    className={`w-4 h-4 ${email.isStarred ? "fill-amber-400" : ""}`}
                  />
                </button>

                {/* Sender Name */}
                <div className="w-36 md:w-44 shrink-0 truncate">
                  <span
                    className={`text-xs ${
                      !email.isRead ? "font-bold text-slate-100" : "font-medium text-slate-300"
                    }`}
                  >
                    {email.from.name || email.from.email}
                  </span>
                </div>

                {/* Subject & Snippet */}
                <div className="flex-1 min-w-0 flex items-center gap-2">
                  <span
                    className={`text-xs truncate ${
                      !email.isRead ? "font-semibold text-slate-100" : "text-slate-300"
                    }`}
                  >
                    {email.subject}
                  </span>
                  <span className="text-xs text-slate-400 truncate hidden md:inline">
                    - {email.snippet}
                  </span>
                </div>

                {/* AI Priority & Category Tags */}
                <div className="hidden lg:flex items-center gap-1.5 shrink-0">
                  {getPriorityBadge(email.aiPriority)}
                  {email.aiCategory && (
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                      {email.aiCategory}
                    </span>
                  )}
                </div>

                {/* Attachment Indicator */}
                {email.attachments && email.attachments.length > 0 && (
                  <div className="text-slate-400 shrink-0" title="Has attachments">
                    <Paperclip className="w-3.5 h-3.5" />
                  </div>
                )}

                {/* Date / Timestamp */}
                <div className="w-16 text-right shrink-0">
                  <span className="text-[11px] font-medium text-slate-400 group-hover:hidden">
                    {formatDate(email.date)}
                  </span>

                  {/* Hover Action Buttons */}
                  <div className="hidden group-hover:flex items-center justify-end gap-1">
                    <button
                      type="button"
                      id={`row-read-toggle-${email.id}`}
                      onClick={(e) => onToggleRead(email, e)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
                      title={email.isRead ? "Mark Unread" : "Mark Read"}
                    >
                      {email.isRead ? <Mail className="w-3.5 h-3.5" /> : <MailOpen className="w-3.5 h-3.5" />}
                    </button>
                    <button
                      type="button"
                      id={`row-archive-${email.id}`}
                      onClick={(e) => onArchive(email, e)}
                      className="p-1 hover:bg-slate-700 rounded text-slate-400 hover:text-slate-200"
                      title="Archive"
                    >
                      <Archive className="w-3.5 h-3.5" />
                    </button>
                    <button
                      type="button"
                      id={`row-trash-${email.id}`}
                      onClick={(e) => onTrash(email, e)}
                      className="p-1 hover:bg-rose-500/20 rounded text-slate-400 hover:text-rose-400"
                      title="Trash"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
};
