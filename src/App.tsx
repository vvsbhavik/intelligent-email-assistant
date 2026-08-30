import React, { useState, useEffect, useCallback } from "react";
import { AuthProvider, useAuth } from "./context/AuthContext";
import { Navbar } from "./components/layout/Navbar";
import { Sidebar } from "./components/layout/Sidebar";
import { EmailList } from "./components/email/EmailList";
import { EmailView } from "./components/email/EmailView";
import { ComposeModal } from "./components/email/ComposeModal";
import { AIAssistantPanel } from "./components/ai/AIAssistantPanel";
import { ActivityLog } from "./components/activity/ActivityLog";
import { SystemStatusModal } from "./components/settings/SystemStatusModal";
import { LoginPage } from "./components/auth/LoginPage";
import { EmailMessage, EmailThread, FolderType } from "./types";
import { api } from "./services/api";
import { RefreshCw } from "lucide-react";

const MainDashboard: React.FC = () => {
  const { isAuthenticated, loading, refreshSession } = useAuth();

  // Navigation & View state
  const [currentFolder, setCurrentFolder] = useState<FolderType>("inbox");
  const [currentView, setCurrentView] = useState<"emails" | "activity">("emails");

  // Search & Filter state
  const [searchQuery, setSearchQuery] = useState("");
  const [unreadOnly, setUnreadOnly] = useState(false);
  const [starredOnly, setStarredOnly] = useState(false);

  // Email List & Selected Email state
  const [emails, setEmails] = useState<EmailMessage[]>([]);
  const [isLoadingEmails, setIsLoadingEmails] = useState(false);
  const [selectedEmail, setSelectedEmail] = useState<EmailMessage | null>(null);
  const [currentThread, setCurrentThread] = useState<EmailThread | undefined>(undefined);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // AI Assistant Drawer state
  const [isAiPanelOpen, setIsAiPanelOpen] = useState(true);

  // Compose Modal state
  const [isComposeOpen, setIsComposeOpen] = useState(false);
  const [composeInitialData, setComposeInitialData] = useState<{
    to?: string;
    subject?: string;
    body?: string;
    threadId?: string;
    inReplyTo?: string;
  }>({});

  // System Status / Docs modal
  const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);

  // Unread & Starred count calculation
  const unreadCount = emails.filter((e) => !e.isRead).length;
  const starredCount = emails.filter((e) => e.isStarred).length;

  // Load emails
  const loadEmails = useCallback(async () => {
    if (!isAuthenticated) return;
    setIsLoadingEmails(true);
    try {
      const res = await api.getEmails({
        folder: currentFolder,
        q: searchQuery || undefined,
        unread: unreadOnly || undefined,
        starred: starredOnly || undefined,
      });
      setEmails(res.messages || []);
    } catch (err: any) {
      console.warn("Could not load emails:", err.message || err);
      if (err.message && (err.message.includes("expired") || err.message.includes("Unauthorized"))) {
        await refreshSession();
      }
    } finally {
      setIsLoadingEmails(false);
    }
  }, [isAuthenticated, currentFolder, searchQuery, unreadOnly, starredOnly, refreshSession]);

  useEffect(() => {
    loadEmails();
  }, [loadEmails]);

  // Handle single email selection & thread fetch
  const handleSelectEmail = async (email: EmailMessage) => {
    if (email.labelIds?.includes("DRAFT") || currentFolder === "drafts") {
      setComposeInitialData({
        to: email.to.map(t => t.email).join(", "),
        cc: email.cc?.map(t => t.email).join(", ") || "",
        bcc: email.bcc?.map(t => t.email).join(", ") || "",
        subject: email.subject,
        body: email.bodyText || email.snippet,
        threadId: email.threadId,
        inReplyTo: email.id, // We use this to track the draft message ID
      });
      setIsComposeOpen(true);
      return;
    }

    setSelectedEmail(email);
    // Mark as read if not already read
    if (!email.isRead) {
      try {
        await api.updateEmailLabel(email.id, "read", true);
        setEmails((prev) =>
          prev.map((e) => (e.id === email.id ? { ...e, isRead: true } : e))
        );
      } catch (err) {
        console.error("Failed to mark as read", err);
      }
    }

    // Fetch full thread if threadId exists
    try {
      const res = await api.getEmailById(email.id);
      if (res.thread) {
        setCurrentThread(res.thread);
      }
    } catch (err) {
      console.warn("Could not load thread data:", err);
    }
  };

  // Toggle Star
  const handleToggleStar = async (email: EmailMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newStarred = !email.isStarred;
    try {
      await api.updateEmailLabel(email.id, "star", newStarred);
      setEmails((prev) =>
        prev.map((item) => (item.id === email.id ? { ...item, isStarred: newStarred } : item))
      );
      if (selectedEmail?.id === email.id) {
        setSelectedEmail((prev) => (prev ? { ...prev, isStarred: newStarred } : null));
      }
    } catch (err) {
      console.error("Failed to toggle star", err);
    }
  };

  // Toggle Read / Unread
  const handleToggleRead = async (email: EmailMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const newRead = !email.isRead;
    try {
      await api.updateEmailLabel(email.id, "read", newRead);
      setEmails((prev) =>
        prev.map((item) => (item.id === email.id ? { ...item, isRead: newRead } : item))
      );
      if (selectedEmail?.id === email.id) {
        setSelectedEmail((prev) => (prev ? { ...prev, isRead: newRead } : null));
      }
    } catch (err) {
      console.error("Failed to toggle read", err);
    }
  };

  // Archive
  const handleArchive = async (email: EmailMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.updateEmailLabel(email.id, "archive", true);
      setEmails((prev) => prev.filter((item) => item.id !== email.id));
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
      }
      showNotification("Conversation archived");
    } catch (err) {
      console.error("Failed to archive email", err);
    }
  };

  // Trash
  const handleTrash = async (email: EmailMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.trashEmail(email.id);
      setEmails((prev) => prev.filter((item) => item.id !== email.id));
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
      }
      showNotification("Conversation moved to Trash");
    } catch (err) {
      console.error("Failed to trash email", err);
    }
  };

  // Restore
  const handleRestore = async (email: EmailMessage, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await api.untrashEmail(email.id);
      setEmails((prev) => prev.filter((item) => item.id !== email.id));
      if (selectedEmail?.id === email.id) {
        setSelectedEmail(null);
      }
      showNotification("Conversation restored to Inbox");
    } catch (err) {
      console.error("Failed to restore email", err);
    }
  };

  // Batch actions
  const handleToggleSelectId = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedIds(emails.map((e) => e.id));
  };

  const handleClearSelection = () => {
    setSelectedIds([]);
  };

  const handleBatchAction = async (action: "read" | "unread" | "archive" | "trash") => {
    if (selectedIds.length === 0) return;
    try {
      for (const id of selectedIds) {
        if (action === "read") await api.updateEmailLabel(id, "read", true);
        if (action === "unread") await api.updateEmailLabel(id, "read", false);
        if (action === "archive") await api.updateEmailLabel(id, "archive", true);
        if (action === "trash") await api.trashEmail(id);
      }
      setSelectedIds([]);
      loadEmails();
    } catch (err) {
      console.error("Batch action failed", err);
    }
  };

  // Open Composer for standard new email
  const handleOpenCompose = () => {
    setComposeInitialData({});
    setIsComposeOpen(true);
  };

  // Open Composer for Reply
  const handleOpenReply = (email: EmailMessage, isReplyAll = false) => {
    const toRecipients = isReplyAll
      ? [email.from.email, ...email.to.map((t) => t.email)].join(", ")
      : email.from.email;

    const replySubject = email.subject.startsWith("Re:")
      ? email.subject
      : `Re: ${email.subject}`;

    setComposeInitialData({
      to: toRecipients,
      subject: replySubject,
      body: `\n\nOn ${email.date}, ${email.from.name || email.from.email} wrote:\n> ${email.bodyText || email.snippet}`,
      threadId: email.threadId,
      inReplyTo: email.id,
    });
    setIsComposeOpen(true);
  };

  // Open Composer for Forward
  const handleOpenForward = (email: EmailMessage) => {
    const fwdSubject = email.subject.startsWith("Fwd:")
      ? email.subject
      : `Fwd: ${email.subject}`;

    setComposeInitialData({
      to: "",
      subject: fwdSubject,
      body: `\n\n---------- Forwarded message ---------\nFrom: ${email.from.name || email.from.email} <${email.from.email}>\nDate: ${email.date}\nSubject: ${email.subject}\nTo: ${email.to.map((t) => t.email).join(", ")}\n\n${email.bodyText || email.snippet}`,
    });
    setIsComposeOpen(true);
  };

  // Insert AI generated reply directly into Compose Modal
  const handleInsertAiReply = (replySubject: string, replyBody: string) => {
    if (!selectedEmail) return;
    setComposeInitialData({
      to: selectedEmail.from.email,
      subject: replySubject || `Re: ${selectedEmail.subject}`,
      body: replyBody,
      threadId: selectedEmail.threadId,
      inReplyTo: selectedEmail.id,
    });
    setIsComposeOpen(true);
  };

  const [notification, setNotification] = useState<{message: string, type: "success" | "error"} | null>(null);

  const showNotification = (message: string, type: "success" | "error" = "success") => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-400 gap-3">
        <RefreshCw className="w-8 h-8 animate-spin text-sky-400" />
        <span className="text-xs font-semibold tracking-wide">
          Initializing Intelligent Email Assistant...
        </span>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <>
        <LoginPage onOpenStatusModal={() => setIsStatusModalOpen(true)} />
        <SystemStatusModal
          isOpen={isStatusModalOpen}
          onClose={() => setIsStatusModalOpen(false)}
        />
      </>
    );
  }

  return (
    <div className="h-screen w-screen bg-slate-950 text-slate-100 flex flex-col overflow-hidden select-none">
      {/* Top Navigation */}
      <Navbar
        searchQuery={searchQuery}
        onSearchChange={setSearchQuery}
        unreadOnly={unreadOnly}
        onToggleUnread={() => setUnreadOnly(!unreadOnly)}
        starredOnly={starredOnly}
        onToggleStarred={() => setStarredOnly(!starredOnly)}
        onRefresh={loadEmails}
        isRefreshing={isLoadingEmails}
        onOpenStatusModal={() => setIsStatusModalOpen(true)}
      />

      {/* Main Workspace Frame */}
      <div className="flex-1 flex overflow-hidden">
        {/* Left Navigation Sidebar */}
        <Sidebar
          currentFolder={currentFolder}
          currentView={currentView}
          onSelectFolder={(folder) => {
            setCurrentFolder(folder);
            setSelectedEmail(null);
          }}
          onSelectView={setCurrentView}
          onOpenCompose={handleOpenCompose}
          unreadCount={unreadCount}
          starredCount={starredCount}
          totalEmails={emails.length}
          onOpenStatusModal={() => setIsStatusModalOpen(true)}
        />

        {/* Center Canvas */}
        <main className="flex-1 flex overflow-hidden relative">
          {currentView === "activity" ? (
            <ActivityLog onBackToInbox={() => setCurrentView("emails")} />
          ) : selectedEmail ? (
            <EmailView
              email={selectedEmail}
              thread={currentThread}
              onBack={() => {
                setSelectedEmail(null);
                setCurrentThread(undefined);
              }}
              onToggleStar={handleToggleStar}
              onArchive={handleArchive}
              onTrash={handleTrash}
              onRestore={handleRestore}
              onOpenReply={handleOpenReply}
              onOpenForward={handleOpenForward}
              onTriggerAiSummary={() => {
                setIsAiPanelOpen(true);
              }}
              onTriggerAiReply={() => {
                setIsAiPanelOpen(true);
              }}
            />
          ) : (
            <EmailList
              emails={emails}
              selectedEmailId={selectedEmail?.id || null}
              onSelectEmail={handleSelectEmail}
              onToggleStar={handleToggleStar}
              onToggleRead={handleToggleRead}
              onArchive={handleArchive}
              onTrash={handleTrash}
              currentFolder={currentFolder}
              isLoading={isLoadingEmails}
              selectedIds={selectedIds}
              onToggleSelectId={handleToggleSelectId}
              onSelectAll={handleSelectAll}
              onClearSelection={handleClearSelection}
              onBatchAction={handleBatchAction}
            />
          )}

          {/* Right Gemini AI Assistant Panel */}
          {currentView === "emails" && (
            <AIAssistantPanel
              email={selectedEmail}
              isOpen={isAiPanelOpen}
              onClose={() => setIsAiPanelOpen(false)}
              onInsertReplyIntoComposer={handleInsertAiReply}
            />
          )}
        </main>
      </div>

      {/* Modals & Overlays */}
      <ComposeModal
        isOpen={isComposeOpen}
        onClose={() => setIsComposeOpen(false)}
        onSendSuccess={() => {
          showNotification("Email sent successfully!");
          loadEmails();
        }}
        initialTo={composeInitialData.to}
        initialSubject={composeInitialData.subject}
        initialBody={composeInitialData.body}
        threadId={composeInitialData.threadId}
        inReplyTo={composeInitialData.inReplyTo}
      />

      <SystemStatusModal
        isOpen={isStatusModalOpen}
        onClose={() => setIsStatusModalOpen(false)}
      />

      {/* Global Notification Toast */}
      {notification && (
        <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 z-[100] px-4 py-2.5 rounded-full shadow-lg border text-sm font-medium flex items-center gap-2 animate-in slide-in-from-bottom-5 ${
          notification.type === "success"
            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
        }`}>
          {notification.message}
        </div>
      )}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <MainDashboard />
    </AuthProvider>
  );
}
