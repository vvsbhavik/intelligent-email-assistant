import React, { useEffect, useState } from "react";
import {
  Activity,
  Database,
  RefreshCw,
  Sparkles,
  Send,
  Trash2,
  Star,
  Archive,
  Eye,
  Bot,
  Filter,
  CheckCircle,
  Clock,
} from "lucide-react";
import { EmailActivity } from "../../types";
import { api } from "../../services/api";
import { useAuth } from "../../context/AuthContext";

export const ActivityLog: React.FC<{ onBackToInbox: () => void }> = ({ onBackToInbox }) => {
  const { isDemo, systemStatus } = useAuth();
  const [activities, setActivities] = useState<EmailActivity[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [filterAction, setFilterAction] = useState<string>("all");

  const fetchActivities = async () => {
    setIsLoading(true);
    try {
      const list = await api.getActivities();
      setActivities(list);
    } catch (err) {
      console.error("Failed to load activities:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchActivities();
  }, []);

  const getActionBadge = (action: string) => {
    switch (action) {
      case "ai_summarize":
        return {
          label: "AI Summarized",
          icon: Sparkles,
          color: "bg-sky-500/10 text-sky-400 border-sky-500/20",
        };
      case "ai_generate_reply":
        return {
          label: "AI Reply Generated",
          icon: Bot,
          color: "bg-indigo-500/10 text-indigo-400 border-indigo-500/20",
        };
      case "ai_explain":
        return {
          label: "AI Explained (ELI5)",
          icon: Sparkles,
          color: "bg-purple-500/10 text-purple-400 border-purple-500/20",
        };
      case "send_email":
        return {
          label: "Sent Email",
          icon: Send,
          color: "bg-emerald-500/10 text-emerald-400 border-emerald-500/20",
        };
      case "trash_email":
        return {
          label: "Moved to Trash",
          icon: Trash2,
          color: "bg-rose-500/10 text-rose-400 border-rose-500/20",
        };
      case "archive_on":
      case "archive_true":
        return {
          label: "Archived",
          icon: Archive,
          color: "bg-slate-700/50 text-slate-300 border-slate-600/30",
        };
      case "star_on":
      case "star_true":
        return {
          label: "Starred",
          icon: Star,
          color: "bg-amber-500/10 text-amber-400 border-amber-500/20",
        };
      case "view_email":
        return {
          label: "Opened Email",
          icon: Eye,
          color: "bg-slate-800 text-slate-400 border-slate-700",
        };
      default:
        return {
          label: action.replace(/_/g, " "),
          icon: Activity,
          color: "bg-slate-800 text-slate-300 border-slate-700",
        };
    }
  };

  const filteredActivities =
    filterAction === "all"
      ? activities
      : activities.filter((a) => a.action.toLowerCase().includes(filterAction.toLowerCase()));

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden">
      {/* Header */}
      <div className="h-16 border-b border-slate-800 px-6 flex items-center justify-between bg-slate-900/90 shrink-0">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-indigo-500/10 border border-indigo-500/20 text-indigo-400">
            <Database className="w-5 h-5" />
          </div>
          <div>
            <h2 className="font-bold text-sm md:text-base text-slate-100 flex items-center gap-2">
              <span>Supabase PostgreSQL Activity History</span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Audited
              </span>
            </h2>
            <p className="text-xs text-slate-400">
              Audit log of all email manipulations, AI summarizations, and message dispatches.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={fetchActivities}
            disabled={isLoading}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
            title="Refresh logs"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin text-sky-400" : ""}`} />
          </button>
          <button
            type="button"
            onClick={onBackToInbox}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
          >
            Return to Inbox
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="px-6 py-3 border-b border-slate-800 bg-slate-850/40 flex items-center justify-between gap-4 shrink-0 text-xs">
        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400 font-medium">Filter by Action:</span>
          <select
            value={filterAction}
            onChange={(e) => setFilterAction(e.target.value)}
            className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2.5 py-1"
          >
            <option value="all">All Activities ({activities.length})</option>
            <option value="ai">AI Actions (Summarize, Reply, Explain)</option>
            <option value="send">Sent Messages</option>
            <option value="trash">Trash / Deletion</option>
            <option value="star">Starred</option>
            <option value="auth">Auth & Login</option>
          </select>
        </div>

        <div className="text-slate-400 text-xs flex items-center gap-1.5">
          <Clock className="w-3.5 h-3.5" />
          <span>Showing {filteredActivities.length} audit entries</span>
        </div>
      </div>

      {/* Table Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {isLoading ? (
          <div className="space-y-3">
            {[1, 2, 3, 4, 5, 6].map((i) => (
              <div key={i} className="h-12 bg-slate-800/40 animate-pulse rounded-xl" />
            ))}
          </div>
        ) : filteredActivities.length === 0 ? (
          <div className="text-center py-16 text-slate-400">
            <Activity className="w-10 h-10 mx-auto text-slate-400 mb-2" />
            <h3 className="font-semibold text-slate-300 text-sm">No activity recorded yet</h3>
            <p className="text-xs text-slate-400 mt-1">
              Actions you take on emails (AI summaries, replies, sends) are automatically logged here.
            </p>
          </div>
        ) : (
          <div className="rounded-2xl border border-slate-800 bg-slate-850/40 overflow-hidden">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-800 bg-slate-800/60 text-slate-400 font-semibold uppercase text-[10px] tracking-wider">
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Email ID / Target</th>
                  <th className="py-3 px-4">Metadata Details</th>
                  <th className="py-3 px-4 text-right">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 text-slate-300">
                {filteredActivities.map((act) => {
                  const badge = getActionBadge(act.action);
                  const Icon = badge.icon;

                  return (
                    <tr key={act.id} className="hover:bg-slate-800/40 transition-colors">
                      <td className="py-3 px-4 font-medium">
                        <span
                          className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg text-xs font-semibold border ${badge.color}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{badge.label}</span>
                        </span>
                      </td>

                      <td className="py-3 px-4 font-mono text-[11px] text-slate-400">
                        {act.email_id}
                      </td>

                      <td className="py-3 px-4 text-slate-400">
                        {act.metadata && Object.keys(act.metadata).length > 0 ? (
                          <div className="font-mono text-[11px] bg-slate-800/80 px-2 py-1 rounded border border-slate-750 inline-block max-w-md truncate">
                            {JSON.stringify(act.metadata)}
                          </div>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right text-slate-400 font-mono text-[11px]">
                        {new Date(act.created_at).toLocaleString()}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
