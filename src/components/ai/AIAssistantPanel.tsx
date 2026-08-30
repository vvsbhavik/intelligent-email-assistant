import React, { useState, useEffect, useRef } from "react";
import {
  Sparkles,
  Bot,
  Wand2,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Send,
  Copy,
  Check,
  RefreshCw,
  HelpCircle,
  ShieldAlert,
  ListTodo,
  FileText,
  ChevronRight,
  Sliders,
  Type,
  X,
} from "lucide-react";
import {
  EmailMessage,
  AISummary,
  AIReply,
  AIExplain,
  ReplyTone,
  TextEnhanceMode,
} from "../../types";
import { api } from "../../services/api";

interface AIAssistantPanelProps {
  email: EmailMessage | null;
  isOpen: boolean;
  onClose: () => void;
  onInsertReplyIntoComposer: (subject: string, body: string) => void;
}

export const AIAssistantPanel: React.FC<AIAssistantPanelProps> = ({
  email,
  isOpen,
  onClose,
  onInsertReplyIntoComposer,
}) => {
  const [activeTab, setActiveTab] = useState<"summary" | "reply" | "explain" | "rewrite">("summary");

  // Summary State
  const [summaryData, setSummaryData] = useState<AISummary | null>(null);
  const [isSummarizing, setIsSummarizing] = useState(false);

  // Reply State
  const [replyTone, setReplyTone] = useState<ReplyTone>("professional");
  const [userInstructions, setUserInstructions] = useState("");
  const [replyData, setReplyData] = useState<AIReply | null>(null);
  const [editableReplyBody, setEditableReplyBody] = useState("");
  const [isGeneratingReply, setIsGeneratingReply] = useState(false);
  const [copiedReply, setCopiedReply] = useState(false);

  // Explain State
  const [explainData, setExplainData] = useState<AIExplain | null>(null);
  const [isExplaining, setIsExplaining] = useState(false);

  // Rewrite / Polish State
  const [rewriteText, setRewriteText] = useState("");
  const [rewriteMode, setRewriteMode] = useState<TextEnhanceMode>("professional");
  const [enhancedResult, setEnhancedResult] = useState<string>("");
  const [isRewriting, setIsRewriting] = useState(false);

  // Cache state to avoid regenerating on tab switches
  const currentEmailId = useRef<string | null>(null);

  useEffect(() => {
    if (email && isOpen) {
      if (currentEmailId.current !== email.id) {
        currentEmailId.current = email.id;
        setSummaryData(null);
        setReplyData(null);
        setEditableReplyBody("");
        setExplainData(null);
        handleSummarize(email);
      }
    }
  }, [email?.id, isOpen]);

  if (!isOpen) return null;

  const [aiError, setAiError] = useState<string | null>(null);

  const handleSummarize = async (targetEmail = email) => {
    if (!targetEmail) return;
    setIsSummarizing(true);
    setAiError(null);
    try {
      const res = await api.summarizeEmail({
        subject: targetEmail.subject,
        sender: targetEmail.from.name ? `${targetEmail.from.name} <${targetEmail.from.email}>` : targetEmail.from.email,
        body: targetEmail.bodyText || targetEmail.snippet,
        emailId: targetEmail.id,
      });
      setSummaryData(res);
    } catch (err: any) {
      console.error("AI Summary error:", err);
      setAiError(err.message || "An error occurred with Gemini AI");
    } finally {
      setIsSummarizing(false);
    }
  };

  const handleGenerateReply = async (toneToUse = replyTone) => {
    if (!email) return;
    setIsGeneratingReply(true);
    setAiError(null);
    try {
      const res = await api.generateReply({
        subject: email.subject,
        sender: email.from.name || email.from.email,
        body: email.bodyText || email.snippet,
        tone: toneToUse,
        userInstructions: userInstructions.trim() || undefined,
        emailId: email.id,
      });
      setReplyData(res);
      setEditableReplyBody(res.replyBody);
    } catch (err: any) {
      console.error("AI Reply error:", err);
      setAiError(err.message || "An error occurred with Gemini AI");
    } finally {
      setIsGeneratingReply(false);
    }
  };

  const handleExplain = async () => {
    if (!email) return;
    setIsExplaining(true);
    setAiError(null);
    try {
      const res = await api.explainEmail({
        subject: email.subject,
        sender: email.from.name || email.from.email,
        body: email.bodyText || email.snippet,
        emailId: email.id,
      });
      setExplainData(res);
    } catch (err: any) {
      console.error("AI Explain error:", err);
      setAiError(err.message || "An error occurred with Gemini AI");
    } finally {
      setIsExplaining(false);
    }
  };

  const handleRewrite = async () => {
    if (!rewriteText.trim()) return;
    setIsRewriting(true);
    setAiError(null);
    try {
      const res = await api.enhanceText({
        text: rewriteText,
        mode: rewriteMode,
      });
      setEnhancedResult(res.enhancedText);
    } catch (err: any) {
      console.error("AI Rewrite error:", err);
      setAiError(err.message || "An error occurred with Gemini AI");
    } finally {
      setIsRewriting(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedReply(true);
    setTimeout(() => setCopiedReply(false), 2000);
  };

  return (
    <aside className="w-80 md:w-96 bg-slate-900 border-l border-slate-800 flex flex-col h-full shrink-0 select-none overflow-hidden z-20">
      {/* Panel Header */}
      <div className="h-14 border-b border-slate-800 px-4 flex items-center justify-between bg-slate-900/90 shrink-0">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-sm">
            <Sparkles className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-bold text-xs md:text-sm text-slate-100">AI Assistant</h3>
            <span className="text-[10px] text-sky-400 font-medium">Gemini 3.7 Flash</span>
          </div>
        </div>

        <button
          type="button"
          onClick={onClose}
          className="p-1.5 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs Row */}
      <div className="flex items-center p-1.5 bg-slate-850 border-b border-slate-800 shrink-0 gap-1 text-[11px] font-medium">
        <button
          type="button"
          id="ai-tab-summary"
          onClick={() => setActiveTab("summary")}
          className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
            activeTab === "summary"
              ? "bg-slate-750 text-sky-400 font-semibold shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Summary
        </button>
        <button
          type="button"
          id="ai-tab-reply"
          onClick={() => {
            setActiveTab("reply");
            if (!replyData && email) handleGenerateReply();
          }}
          className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
            activeTab === "reply"
              ? "bg-slate-750 text-sky-400 font-semibold shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Smart Reply
        </button>
        <button
          type="button"
          id="ai-tab-explain"
          onClick={() => {
            setActiveTab("explain");
            if (!explainData && email) handleExplain();
          }}
          className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
            activeTab === "explain"
              ? "bg-slate-750 text-sky-400 font-semibold shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Explain (ELI5)
        </button>
        <button
          type="button"
          id="ai-tab-rewrite"
          onClick={() => setActiveTab("rewrite")}
          className={`flex-1 py-1.5 rounded-lg text-center transition-all ${
            activeTab === "rewrite"
              ? "bg-slate-750 text-sky-400 font-semibold shadow-sm"
              : "text-slate-400 hover:text-slate-200"
          }`}
        >
          Rewriter
        </button>
      </div>

      {/* Tab Contents */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-slate-200 text-xs">
        {aiError && (
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl flex items-start gap-2 text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
            <p className="leading-snug">{aiError}</p>
          </div>
        )}

        {!email ? (
          <div className="flex flex-col items-center justify-center h-64 text-center text-slate-400 p-4">
            <Bot className="w-8 h-8 text-slate-400 mb-2" />
            <p className="font-medium text-xs text-slate-400">Select an email to view AI insights</p>
          </div>
        ) : (
          <>
            {/* TAB 1: SUMMARY */}
            {activeTab === "summary" && (
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Neural Digest
                  </span>
                  <button
                    type="button"
                    onClick={handleSummarize}
                    disabled={isSummarizing}
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isSummarizing ? "animate-spin" : ""}`} />
                    <span>Regenerate</span>
                  </button>
                </div>

                {isSummarizing ? (
                  <div className="p-6 text-center space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-sky-400 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">Analyzing email with Gemini 3.7...</p>
                  </div>
                ) : summaryData ? (
                  <div className="space-y-3">
                    {/* Priority & Sentiment Badges */}
                    <div className="flex flex-wrap items-center gap-2">
                      <div
                        className={`px-2 py-1 rounded-lg text-[10px] font-bold border ${
                          summaryData.priority === "high"
                            ? "bg-rose-500/15 text-rose-400 border-rose-500/30"
                            : summaryData.priority === "medium"
                            ? "bg-amber-500/15 text-amber-400 border-amber-500/30"
                            : "bg-emerald-500/15 text-emerald-400 border-emerald-500/30"
                        }`}
                      >
                        Priority: {summaryData.priority.toUpperCase()}
                      </div>

                      <div className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-300 border border-slate-700">
                        Sentiment: {summaryData.sentiment}
                      </div>

                      {summaryData.estimatedReadTime && (
                        <div className="px-2 py-1 rounded-lg text-[10px] font-medium bg-slate-800 text-slate-400 flex items-center gap-1">
                          <Clock className="w-2.5 h-2.5" />
                          <span>{summaryData.estimatedReadTime} read</span>
                        </div>
                      )}
                    </div>

                    {/* Executive Summary Card */}
                    <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-1.5">
                      <div className="text-[11px] font-semibold text-sky-400 flex items-center gap-1.5">
                        <FileText className="w-3.5 h-3.5" />
                        <span>Executive Summary</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {summaryData.summary}
                      </p>
                    </div>

                    {/* Key Takeaways */}
                    {summaryData.keyPoints && summaryData.keyPoints.length > 0 && (
                      <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-2">
                        <div className="text-[11px] font-semibold text-slate-200 flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                          <span>Key Takeaways</span>
                        </div>
                        <ul className="space-y-1.5">
                          {summaryData.keyPoints.map((point, idx) => (
                            <li key={idx} className="text-xs text-slate-300 flex items-start gap-2">
                              <span className="text-sky-400 font-bold">•</span>
                              <span className="leading-snug">{point}</span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Action Items */}
                    {summaryData.actionItems && summaryData.actionItems.length > 0 && (
                      <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-2">
                        <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                          <ListTodo className="w-3.5 h-3.5 text-amber-400" />
                          <span>Action Items Required</span>
                        </div>
                        <div className="space-y-1.5">
                          {summaryData.actionItems.map((item, idx) => (
                            <div key={idx} className="flex items-start gap-2 text-xs text-slate-200">
                              <input
                                type="checkbox"
                                className="mt-0.5 rounded border-slate-700 bg-slate-800 text-sky-500 focus:ring-0"
                              />
                              <span className="leading-snug">{item}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleSummarize}
                    className="w-full py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 rounded-xl font-medium text-xs"
                  >
                    Generate AI Summary
                  </button>
                )}
              </div>
            )}

            {/* TAB 2: SMART REPLY */}
            {activeTab === "reply" && (
              <div className="space-y-3">
                <div className="space-y-1.5">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Choose Reply Tone:
                  </label>
                  <div className="grid grid-cols-3 gap-1">
                    {(
                      [
                        ["professional", "Professional"],
                        ["friendly", "Friendly"],
                        ["concise", "Concise"],
                        ["formal", "Formal"],
                        ["direct", "Direct"],
                        ["urgent", "Urgent"],
                      ] as [ReplyTone, string][]
                    ).map(([tKey, tLabel]) => (
                      <button
                        key={tKey}
                        type="button"
                        onClick={() => {
                          setReplyTone(tKey);
                          handleGenerateReply(tKey);
                        }}
                        className={`py-1 px-1.5 rounded-lg text-[10px] font-medium transition-all ${
                          replyTone === tKey
                            ? "bg-sky-500 text-white font-semibold shadow-sm"
                            : "bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-700"
                        }`}
                      >
                        {tLabel}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Custom Prompt or Specific Points:
                  </label>
                  <input
                    type="text"
                    value={userInstructions}
                    onChange={(e) => setUserInstructions(e.target.value)}
                    placeholder="e.g. Agree to meeting, propose Thursday 3 PM"
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <button
                  type="button"
                  id="generate-smart-reply-submit"
                  onClick={() => handleGenerateReply()}
                  disabled={isGeneratingReply}
                  className="w-full py-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow disabled:opacity-50"
                >
                  {isGeneratingReply ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span>{isGeneratingReply ? "Generating Reply..." : "Generate AI Reply"}</span>
                </button>

                {replyData && (
                  <div className="space-y-2 pt-2 border-t border-slate-800">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-slate-300">Generated Draft</span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => copyToClipboard(editableReplyBody)}
                          className="p-1 hover:bg-slate-800 rounded text-slate-400 hover:text-slate-200 text-[10px] flex items-center gap-1"
                        >
                          {copiedReply ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                          <span>{copiedReply ? "Copied" : "Copy"}</span>
                        </button>
                      </div>
                    </div>

                    <textarea
                      value={editableReplyBody}
                      onChange={(e) => setEditableReplyBody(e.target.value)}
                      rows={6}
                      className="w-full p-2.5 bg-slate-850 border border-slate-750 focus:border-sky-500 rounded-xl text-xs text-slate-200 leading-relaxed resize-none focus:outline-none"
                    />

                    <button
                      type="button"
                      id="insert-reply-composer-btn"
                      onClick={() =>
                        onInsertReplyIntoComposer(replyData.replySubject, editableReplyBody)
                      }
                      className="w-full py-2 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-sky-400 font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 transition-colors"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>Open & Send in Composer</span>
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* TAB 3: EXPLAIN THIS EMAIL (ELI5) */}
            {activeTab === "explain" && (
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                    Plain English Breakdown
                  </span>
                  <button
                    type="button"
                    onClick={handleExplain}
                    disabled={isExplaining}
                    className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 disabled:opacity-50"
                  >
                    <RefreshCw className={`w-3 h-3 ${isExplaining ? "animate-spin" : ""}`} />
                    <span>Explain</span>
                  </button>
                </div>

                {isExplaining ? (
                  <div className="p-6 text-center space-y-2">
                    <RefreshCw className="w-6 h-6 animate-spin text-sky-400 mx-auto" />
                    <p className="text-xs text-slate-400 font-medium">Deconstructing email context...</p>
                  </div>
                ) : explainData ? (
                  <div className="space-y-3">
                    {/* Simplified explanation */}
                    <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-1.5">
                      <div className="text-[11px] font-semibold text-sky-400 flex items-center gap-1.5">
                        <HelpCircle className="w-3.5 h-3.5" />
                        <span>What It Actually Means</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {explainData.simplifiedExplanation}
                      </p>
                    </div>

                    {/* What they want */}
                    <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-1.5">
                      <div className="text-[11px] font-semibold text-amber-300 flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-amber-400" />
                        <span>What They Are Asking For</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {explainData.whatTheyWant}
                      </p>
                    </div>

                    {/* What you should do */}
                    <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-1.5">
                      <div className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1.5">
                        <ChevronRight className="w-3.5 h-3.5 text-emerald-400" />
                        <span>Recommended Next Step</span>
                      </div>
                      <p className="text-xs text-slate-200 leading-relaxed">
                        {explainData.whatYouShouldDo}
                      </p>
                    </div>

                    {/* Risks or Catches */}
                    {explainData.potentialRisksOrCatches &&
                      explainData.potentialRisksOrCatches.length > 0 && (
                        <div className="p-3 bg-rose-950/20 border border-rose-900/30 rounded-xl space-y-1.5">
                          <div className="text-[11px] font-semibold text-rose-400 flex items-center gap-1.5">
                            <ShieldAlert className="w-3.5 h-3.5" />
                            <span>Watch Out For (Deadlines / Fine Print)</span>
                          </div>
                          <ul className="space-y-1">
                            {explainData.potentialRisksOrCatches.map((risk, idx) => (
                              <li key={idx} className="text-xs text-rose-200 flex items-start gap-1.5">
                                <span>⚠️</span>
                                <span>{risk}</span>
                              </li>
                            ))}
                          </ul>
                        </div>
                      )}
                  </div>
                ) : (
                  <button
                    type="button"
                    onClick={handleExplain}
                    className="w-full py-2 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 rounded-xl font-medium text-xs"
                  >
                    Explain This Email in Plain English
                  </button>
                )}
              </div>
            )}

            {/* TAB 4: REWRITER & GRAMMAR POLISHER */}
            {activeTab === "rewrite" && (
              <div className="space-y-3">
                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">
                    Paste or Type Any Text:
                  </label>
                  <textarea
                    value={rewriteText}
                    onChange={(e) => setRewriteText(e.target.value)}
                    rows={4}
                    placeholder="Enter draft sentences to polish..."
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 block">Target Style:</label>
                  <select
                    value={rewriteMode}
                    onChange={(e) => setRewriteMode(e.target.value as TextEnhanceMode)}
                    className="w-full p-2 bg-slate-800 border border-slate-700 rounded-xl text-xs text-slate-200"
                  >
                    <option value="fix_grammar">Fix Grammar & Punctuation</option>
                    <option value="professional">Executive & Professional</option>
                    <option value="friendly">Warm & Personable</option>
                    <option value="concise">Ultra Concise (Remove fluff)</option>
                    <option value="assertive">Assertive & Confident</option>
                    <option value="expand">Elaborate & Detail</option>
                  </select>
                </div>

                <button
                  type="button"
                  onClick={handleRewrite}
                  disabled={isRewriting || !rewriteText.trim()}
                  className="w-full py-2 bg-gradient-to-r from-sky-500 to-indigo-600 text-white font-semibold rounded-xl text-xs flex items-center justify-center gap-1.5 shadow disabled:opacity-50"
                >
                  {isRewriting ? (
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Wand2 className="w-3.5 h-3.5" />
                  )}
                  <span>Polish with Gemini</span>
                </button>

                {enhancedResult && (
                  <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-[11px] font-bold text-sky-400">Polished Output</span>
                      <button
                        type="button"
                        onClick={() => copyToClipboard(enhancedResult)}
                        className="text-[10px] text-slate-400 hover:text-slate-200 flex items-center gap-1"
                      >
                        <Copy className="w-3 h-3" />
                        <span>Copy</span>
                      </button>
                    </div>
                    <p className="text-xs text-slate-200 leading-relaxed bg-slate-800 p-2.5 rounded-lg border border-slate-700">
                      {enhancedResult}
                    </p>
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>
    </aside>
  );
};
