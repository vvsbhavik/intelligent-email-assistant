import React, { useState } from "react";
import {
  ArrowLeft,
  Star,
  Archive,
  Trash2,
  Reply,
  ReplyAll,
  Forward,
  Sparkles,
  Paperclip,
  Clock,
  ChevronDown,
  ChevronUp,
  Download,
  Mail,
  User,
  Bot,
  ExternalLink,
} from "lucide-react";
import { EmailMessage, EmailThread } from "../../types";

interface EmailViewProps {
  email: EmailMessage;
  thread?: EmailThread;
  onBack: () => void;
  onToggleStar: (email: EmailMessage) => void;
  onArchive: (email: EmailMessage) => void;
  onTrash: (email: EmailMessage) => void;
  onRestore?: (email: EmailMessage) => void;
  onOpenReply: (email: EmailMessage, isReplyAll?: boolean) => void;
  onOpenForward: (email: EmailMessage) => void;
  onTriggerAiSummary: () => void;
  onTriggerAiReply: () => void;
}

export const EmailView: React.FC<EmailViewProps> = ({
  email,
  thread,
  onBack,
  onToggleStar,
  onArchive,
  onTrash,
  onRestore,
  onOpenReply,
  onOpenForward,
  onTriggerAiSummary,
  onTriggerAiReply,
}) => {
  const [showHtml, setShowHtml] = useState(true);
  const [expandedThreadIds, setExpandedThreadIds] = useState<string[]>([]);

  const toggleThreadMessage = (id: string) => {
    setExpandedThreadIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const formatFullDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleString("en-US", {
        weekday: "short",
        month: "short",
        day: "numeric",
        year: "numeric",
        hour: "numeric",
        minute: "2-digit",
        hour12: true,
      });
    } catch {
      return dateStr;
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  };

  const threadMessages = thread?.messages?.filter((m) => m.id !== email.id) || [];

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
      {/* View Header Toolbar */}
      <div className="h-14 border-b border-slate-800 px-4 md:px-6 flex items-center justify-between gap-4 bg-slate-900/95 shrink-0 select-none">
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="email-view-back-btn"
            onClick={onBack}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
            title="Back to inbox"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="h-4 w-px bg-slate-800 mx-1" />

          {/* Action Icons */}
          <button
            type="button"
            id="view-archive-btn"
            onClick={() => onArchive(email)}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
            title="Archive email"
          >
            <Archive className="w-4 h-4" />
          </button>

          <button
            type="button"
            id="view-star-btn"
            onClick={() => onToggleStar(email)}
            className={`p-2 rounded-xl transition-colors ${
              email.isStarred
                ? "text-amber-400 hover:text-amber-300"
                : "text-slate-400 hover:text-amber-400 hover:bg-slate-800"
            }`}
            title={email.isStarred ? "Starred" : "Star"}
          >
            <Star className={`w-4 h-4 ${email.isStarred ? "fill-amber-400" : ""}`} />
          </button>

          <button
            type="button"
            id="view-trash-btn"
            onClick={() => email.isTrash && onRestore ? onRestore(email) : onTrash(email)}
            className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
            title={email.isTrash ? "Restore to Inbox" : "Move to Trash"}
          >
            {email.isTrash ? <Archive className="w-4 h-4 rotate-180" /> : <Trash2 className="w-4 h-4" />}
          </button>
        </div>

        {/* AI Quick Actions in header */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            id="view-ai-summary-btn"
            onClick={onTriggerAiSummary}
            className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 border border-sky-500/20 text-sky-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Sparkles className="w-3.5 h-3.5 text-sky-400" />
            <span>AI Summarize</span>
          </button>

          <button
            type="button"
            id="view-ai-reply-btn"
            onClick={onTriggerAiReply}
            className="px-3 py-1.5 rounded-xl bg-indigo-500/15 hover:bg-indigo-500/25 border border-indigo-500/25 text-indigo-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Bot className="w-3.5 h-3.5 text-indigo-400" />
            <span>Smart Reply</span>
          </button>
        </div>
      </div>

      {/* Main Email Reading Canvas */}
      <div className="flex-1 overflow-y-auto p-4 md:p-8 space-y-6">
        {/* Email Header Block */}
        <div className="space-y-4">
          <div className="flex items-start justify-between gap-4">
            <h2 className="text-lg md:text-xl font-bold text-slate-100 leading-snug">
              {email.subject}
            </h2>
            {email.aiPriority === "high" && (
              <span className="shrink-0 px-2.5 py-1 rounded-lg text-xs font-bold bg-rose-500/15 text-rose-400 border border-rose-500/25 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-pulse" />
                Urgent Priority
              </span>
            )}
          </div>

          <div className="flex items-start justify-between gap-4 bg-slate-850/60 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-indigo-600 flex items-center justify-center font-bold text-sm text-white shrink-0 shadow">
                {email.from.name ? email.from.name.slice(0, 2).toUpperCase() : "EM"}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-semibold text-slate-200 text-sm truncate">
                    {email.from.name || email.from.email}
                  </span>
                  <span className="text-xs text-slate-400 truncate hidden sm:inline">
                    &lt;{email.from.email}&gt;
                  </span>
                </div>
                <div className="text-xs text-slate-400 truncate mt-0.5">
                  to {email.to.map((t) => t.name || t.email).join(", ")}
                </div>
              </div>
            </div>

            <div className="text-right shrink-0 text-xs text-slate-400">
              <div className="flex items-center gap-1">
                <Clock className="w-3 h-3" />
                <span>{formatFullDate(email.date)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Attachments Section */}
        {email.attachments && email.attachments.length > 0 && (
          <div className="p-3 bg-slate-850 rounded-2xl border border-slate-800 space-y-2">
            <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-300">
              <Paperclip className="w-3.5 h-3.5 text-sky-400" />
              <span>Attachments ({email.attachments.length})</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              {email.attachments.map((att) => (
                <div
                  key={att.id}
                  className="flex items-center justify-between p-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 transition-colors"
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <div className="p-1.5 rounded-lg bg-sky-500/10 text-sky-400">
                      <Paperclip className="w-3.5 h-3.5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-medium text-slate-200 truncate">
                        {att.filename}
                      </div>
                      <div className="text-[10px] text-slate-400">
                        {formatFileSize(att.size)}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="p-1.5 text-slate-400 hover:text-slate-200 rounded-lg transition-colors"
                    title="Download"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Email Body Content */}
        <div className="bg-slate-850/40 rounded-2xl p-6 border border-slate-800 text-slate-200 text-sm leading-relaxed min-h-[160px]">
          {showHtml && email.bodyHtml ? (
            <div
              className="prose prose-invert max-w-none prose-p:leading-relaxed prose-a:text-sky-400 prose-headings:text-slate-100"
              dangerouslySetInnerHTML={{ __html: email.bodyHtml }}
            />
          ) : (
            <div className="whitespace-pre-wrap font-sans text-slate-200 leading-relaxed">
              {email.bodyText || email.snippet}
            </div>
          )}
        </div>

        {/* Thread History Accordion if present */}
        {threadMessages.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-800">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Earlier Messages in Thread ({threadMessages.length})
            </h4>
            {threadMessages.map((msg) => {
              const isExpanded = expandedThreadIds.includes(msg.id);
              return (
                <div
                  key={msg.id}
                  className="rounded-xl border border-slate-800 bg-slate-850/40 overflow-hidden"
                >
                  <div
                    onClick={() => toggleThreadMessage(msg.id)}
                    className="p-3.5 flex items-center justify-between hover:bg-slate-800 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-bold text-slate-300">
                        {msg.from.name ? msg.from.name.slice(0, 1) : "U"}
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-slate-200">
                          {msg.from.name || msg.from.email}
                        </div>
                        <div className="text-[11px] text-slate-400 truncate max-w-md">
                          {msg.snippet}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 text-xs text-slate-400">
                      <span>{formatFullDate(msg.date)}</span>
                      {isExpanded ? (
                        <ChevronUp className="w-4 h-4" />
                      ) : (
                        <ChevronDown className="w-4 h-4" />
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-4 border-t border-slate-800 text-xs text-slate-300 leading-relaxed bg-slate-850/80">
                      {msg.bodyText || msg.snippet}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Bottom Reply Bar */}
        <div className="pt-6 border-t border-slate-800 flex flex-wrap items-center gap-3">
          <button
            type="button"
            id="view-reply-action-btn"
            onClick={() => onOpenReply(email, false)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Reply className="w-3.5 h-3.5" />
            <span>Reply</span>
          </button>

          <button
            type="button"
            id="view-reply-all-btn"
            onClick={() => onOpenReply(email, true)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <ReplyAll className="w-3.5 h-3.5" />
            <span>Reply All</span>
          </button>

          <button
            type="button"
            id="view-forward-btn"
            onClick={() => onOpenForward(email)}
            className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 hover:text-white text-xs font-semibold flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Forward className="w-3.5 h-3.5" />
            <span>Forward</span>
          </button>
        </div>
      </div>
    </div>
  );
};
