import React, { useState } from "react";
import {
  X,
  Minus,
  Maximize2,
  Minimize2,
  Send,
  Sparkles,
  Paperclip,
  Trash2,
  Wand2,
  Check,
  ChevronDown,
  RefreshCw,
  Sliders,
  Type,
} from "lucide-react";
import { api } from "../../services/api";
import { ReplyTone, TextEnhanceMode } from "../../types";

interface ComposeModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSendSuccess: () => void;
  initialTo?: string;
  initialSubject?: string;
  initialBody?: string;
  threadId?: string;
  inReplyTo?: string;
}

export const ComposeModal: React.FC<ComposeModalProps> = ({
  isOpen,
  onClose,
  onSendSuccess,
  initialTo = "",
  initialSubject = "",
  initialBody = "",
  threadId,
  inReplyTo,
}) => {
  const [to, setTo] = useState(initialTo);
  const [cc, setCc] = useState("");
  const [bcc, setBcc] = useState("");
  const [showCcBcc, setShowCcBcc] = useState(false);
  const [subject, setSubject] = useState(initialSubject);
  const [body, setBody] = useState(initialBody);

  const [isSending, setIsSending] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);

  // AI Assistance states
  const [showAiDraftModal, setShowAiDraftModal] = useState(false);
  const [aiDraftPrompt, setAiDraftPrompt] = useState("");
  const [aiTone, setAiTone] = useState<ReplyTone>("professional");
  const [isGeneratingDraft, setIsGeneratingDraft] = useState(false);

  const [isEnhancing, setIsEnhancing] = useState(false);
  const [generatedSubjects, setGeneratedSubjects] = useState<string[]>([]);
  const [showSubjectOptions, setShowSubjectOptions] = useState(false);

  // Sync state when props change or modal opens
  React.useEffect(() => {
    if (isOpen) {
      setTo(initialTo);
      setSubject(initialSubject);
      setBody(initialBody);
      setErrorMessage(null);
    }
  }, [isOpen, initialTo, initialSubject, initialBody]);

  if (!isOpen) return null;

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!to.trim() || !subject.trim() || !body.trim()) {
      setErrorMessage("Please fill in recipient, subject, and email body.");
      return;
    }

    setIsSending(true);
    setErrorMessage(null);
    try {
      await api.sendEmail({
        to: to.trim(),
        cc: cc.trim() || undefined,
        bcc: bcc.trim() || undefined,
        subject: subject.trim(),
        body: body.trim(),
        threadId,
        inReplyTo,
      });
      onSendSuccess();
      onClose();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to send email.");
    } finally {
      setIsSending(false);
    }
  };

  const handleGenerateAiDraft = async () => {
    if (!aiDraftPrompt.trim()) return;
    setIsGeneratingDraft(true);
    try {
      const res = await api.generateReply({
        subject: subject || "Discussion",
        sender: to || "Recipient",
        body: "Context prompt for new email: " + aiDraftPrompt,
        tone: aiTone,
        userInstructions: aiDraftPrompt,
      });

      setBody(res.replyBody);
      if (!subject && res.replySubject) {
        setSubject(res.replySubject.replace(/^Re:\s*/i, ""));
      }
      setShowAiDraftModal(false);
      setAiDraftPrompt("");
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate AI draft");
    } finally {
      setIsGeneratingDraft(false);
    }
  };

  const handleEnhanceText = async (mode: TextEnhanceMode) => {
    if (!body.trim()) return;
    setIsEnhancing(true);
    try {
      const res = await api.enhanceText({ text: body, mode });
      setBody(res.enhancedText);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to polish text");
    } finally {
      setIsEnhancing(false);
    }
  };

  const handleGenerateSubjects = async () => {
    if (!body.trim()) return;
    try {
      const res = await api.generateSubjectLines({ body, currentSubject: subject });
      setGeneratedSubjects(res.subjects);
      setShowSubjectOptions(true);
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to generate subjects");
    }
  };

  return (
    <div className="fixed bottom-0 right-4 md:right-8 z-50 w-full max-w-2xl shadow-2xl transition-all duration-200">
      <div className="bg-slate-900 border border-slate-750 rounded-t-2xl overflow-hidden flex flex-col shadow-2xl">
        {/* Header Bar */}
        <div className="h-12 bg-slate-850 px-4 flex items-center justify-between border-b border-slate-750 select-none">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-xs md:text-sm text-slate-200">
              {inReplyTo ? "Reply Message" : "New Message"}
            </span>
            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-semibold bg-sky-500/10 text-sky-400 border border-sky-500/20">
              <Sparkles className="w-2.5 h-2.5 mr-0.5" /> AI Assist
            </span>
          </div>

          <div className="flex items-center gap-1 text-slate-400">
            <button
              type="button"
              onClick={() => setIsMinimized(!isMinimized)}
              className="p-1.5 hover:text-slate-200 hover:bg-slate-800 rounded-lg transition-colors"
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <button
              type="button"
              id="compose-close-btn"
              onClick={onClose}
              className="p-1.5 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Modal Body (Collapsible) */}
        {!isMinimized && (
          <div className="p-4 space-y-3 max-h-[75vh] overflow-y-auto">
            {errorMessage && (
              <div className="p-2.5 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
                {errorMessage}
              </div>
            )}

            {/* Recipient Rows */}
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
                <span className="w-12 text-slate-400 font-medium">To:</span>
                <input
                  type="email"
                  id="compose-to-input"
                  value={to}
                  onChange={(e) => setTo(e.target.value)}
                  placeholder="recipient@example.com"
                  className="flex-1 bg-transparent text-slate-200 focus:outline-none placeholder-slate-400 text-xs"
                />
                {!showCcBcc && (
                  <button
                    type="button"
                    onClick={() => setShowCcBcc(true)}
                    className="text-slate-400 hover:text-slate-200 text-[11px]"
                  >
                    Cc / Bcc
                  </button>
                )}
              </div>

              {showCcBcc && (
                <>
                  <div className="flex items-center border-b border-slate-800 pb-1.5">
                    <span className="w-12 text-slate-400 font-medium">Cc:</span>
                    <input
                      type="text"
                      value={cc}
                      onChange={(e) => setCc(e.target.value)}
                      placeholder="cc@example.com"
                      className="flex-1 bg-transparent text-slate-200 focus:outline-none placeholder-slate-400 text-xs"
                    />
                  </div>
                  <div className="flex items-center border-b border-slate-800 pb-1.5">
                    <span className="w-12 text-slate-400 font-medium">Bcc:</span>
                    <input
                      type="text"
                      value={bcc}
                      onChange={(e) => setBcc(e.target.value)}
                      placeholder="bcc@example.com"
                      className="flex-1 bg-transparent text-slate-200 focus:outline-none placeholder-slate-400 text-xs"
                    />
                  </div>
                </>
              )}

              {/* Subject */}
              <div className="flex items-center justify-between border-b border-slate-800 pb-1.5 gap-2">
                <span className="w-12 text-slate-400 font-medium">Subject:</span>
                <input
                  type="text"
                  id="compose-subject-input"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="Subject line"
                  className="flex-1 bg-transparent text-slate-200 font-medium focus:outline-none placeholder-slate-400 text-xs"
                />
                <button
                  type="button"
                  id="compose-ai-subject-btn"
                  onClick={handleGenerateSubjects}
                  disabled={!body.trim()}
                  className="px-2 py-1 bg-sky-500/10 text-sky-400 hover:bg-sky-500/20 disabled:opacity-30 border border-sky-500/20 rounded-lg text-[10px] font-medium flex items-center gap-1 transition-colors"
                  title="Generate 5 subject lines from body"
                >
                  <Sparkles className="w-2.5 h-2.5" />
                  <span>AI Subject</span>
                </button>
              </div>

              {/* Subject suggestions dropdown if available */}
              {showSubjectOptions && generatedSubjects.length > 0 && (
                <div className="p-2 bg-slate-850 rounded-xl border border-slate-750 space-y-1">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Suggested Subjects (Click to apply)
                  </div>
                  {generatedSubjects.map((sub, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => {
                        setSubject(sub);
                        setShowSubjectOptions(false);
                      }}
                      className="w-full text-left p-1.5 rounded-lg text-xs hover:bg-slate-800 text-slate-200 truncate transition-colors flex items-center justify-between"
                    >
                      <span>{sub}</span>
                      <Check className="w-3 h-3 text-sky-400 opacity-0 hover:opacity-100" />
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* AI Assistant Quick Generator Banner */}
            <div className="bg-gradient-to-r from-sky-950/40 via-indigo-950/40 to-slate-900 p-2.5 rounded-xl border border-sky-900/30 flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs text-sky-300">
                <Wand2 className="w-3.5 h-3.5 text-sky-400" />
                <span className="font-medium">Need Gemini to draft or polish?</span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  id="compose-open-draft-ai"
                  onClick={() => setShowAiDraftModal(!showAiDraftModal)}
                  className="px-2.5 py-1 bg-sky-500/20 hover:bg-sky-500/30 text-sky-200 border border-sky-500/30 rounded-lg text-[11px] font-semibold transition-colors"
                >
                  Draft with AI
                </button>
              </div>
            </div>

            {/* AI Prompt Input Bar if expanded */}
            {showAiDraftModal && (
              <div className="p-3 bg-slate-850 rounded-xl border border-slate-750 space-y-2">
                <label className="text-[11px] font-semibold text-slate-300 block">
                  Describe what you want to say:
                </label>
                <textarea
                  id="ai-draft-prompt-textarea"
                  value={aiDraftPrompt}
                  onChange={(e) => setAiDraftPrompt(e.target.value)}
                  placeholder="e.g. Confirm we received their quote and schedule a follow-up demo for Tuesday 2 PM..."
                  rows={2}
                  className="w-full p-2 bg-slate-800 border border-slate-700 rounded-lg text-xs text-slate-200 placeholder-slate-400 focus:outline-none focus:border-sky-500"
                />
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-[11px] text-slate-400 font-medium">Tone:</span>
                    <select
                      value={aiTone}
                      onChange={(e) => setAiTone(e.target.value as ReplyTone)}
                      className="bg-slate-800 border border-slate-700 text-slate-200 text-xs rounded-lg px-2 py-1"
                    >
                      <option value="professional">Professional</option>
                      <option value="friendly">Friendly & Warm</option>
                      <option value="concise">Concise / Direct</option>
                      <option value="formal">Formal</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                  <button
                    type="button"
                    id="compose-submit-ai-draft"
                    onClick={handleGenerateAiDraft}
                    disabled={isGeneratingDraft || !aiDraftPrompt.trim()}
                    className="px-3 py-1.5 bg-gradient-to-r from-sky-500 to-indigo-600 text-white text-xs font-semibold rounded-lg shadow disabled:opacity-40 flex items-center gap-1.5"
                  >
                    {isGeneratingDraft ? (
                      <RefreshCw className="w-3 h-3 animate-spin" />
                    ) : (
                      <Sparkles className="w-3 h-3" />
                    )}
                    <span>Generate Draft</span>
                  </button>
                </div>
              </div>
            )}

            {/* Email Body Textarea */}
            <textarea
              id="compose-body-textarea"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Write your email here..."
              rows={10}
              className="w-full p-3 bg-slate-850/70 focus:bg-slate-850 border border-slate-750 focus:border-sky-500/70 rounded-xl text-xs md:text-sm text-slate-200 placeholder-slate-400 focus:outline-none leading-relaxed transition-colors resize-none"
            />

            {/* AI Text Polishing Tools Row */}
            <div className="flex flex-wrap items-center gap-1.5 pt-1 text-slate-400">
              <span className="text-[10px] uppercase font-bold text-slate-400 mr-1">AI Polish:</span>
              <button
                type="button"
                onClick={() => handleEnhanceText("fix_grammar")}
                disabled={isEnhancing || !body.trim()}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-750 disabled:opacity-30 rounded-lg text-[11px] text-slate-300 transition-colors"
              >
                Fix Grammar
              </button>
              <button
                type="button"
                onClick={() => handleEnhanceText("concise")}
                disabled={isEnhancing || !body.trim()}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-750 disabled:opacity-30 rounded-lg text-[11px] text-slate-300 transition-colors"
              >
                Make Concise
              </button>
              <button
                type="button"
                onClick={() => handleEnhanceText("professional")}
                disabled={isEnhancing || !body.trim()}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-750 disabled:opacity-30 rounded-lg text-[11px] text-slate-300 transition-colors"
              >
                More Professional
              </button>
              <button
                type="button"
                onClick={() => handleEnhanceText("friendly")}
                disabled={isEnhancing || !body.trim()}
                className="px-2 py-1 bg-slate-800 hover:bg-slate-750 disabled:opacity-30 rounded-lg text-[11px] text-slate-300 transition-colors"
              >
                Warm & Friendly
              </button>
              {isEnhancing && <RefreshCw className="w-3.5 h-3.5 animate-spin text-sky-400 ml-1" />}
            </div>

            {/* Footer Send Actions */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-800">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="compose-send-btn"
                  onClick={() => handleSend()}
                  disabled={isSending}
                  className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs md:text-sm shadow-md shadow-sky-500/20 flex items-center gap-2 disabled:opacity-50 transition-all cursor-pointer"
                >
                  {isSending ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                  <span>{isSending ? "Sending..." : "Send Email"}</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  id="compose-discard-btn"
                  onClick={onClose}
                  className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
                  title="Discard draft"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
