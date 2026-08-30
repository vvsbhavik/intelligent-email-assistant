import {
  EmailMessage,
  EmailThread,
  AISummary,
  AIReply,
  AIExplain,
  EmailActivity,
  SystemStatus,
  FolderType,
  ReplyTone,
  TextEnhanceMode,
  User,
} from "../types";

export interface SessionResponse {
  authenticated: boolean;
  user: User | null;
  isDemo: boolean;
  isRealGoogleConnected: boolean;
  sessionId?: string | null;
}

const SESSION_STORAGE_KEY = "iea_session_id";

export function getStoredSessionId(): string | null {
  try {
    return localStorage.getItem(SESSION_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function setStoredSessionId(id: string | null): void {
  try {
    if (id) {
      localStorage.setItem(SESSION_STORAGE_KEY, id);
    } else {
      localStorage.removeItem(SESSION_STORAGE_KEY);
    }
  } catch {}
}

/**
 * Single source-of-truth for the backend base URL.
 * Set VITE_BACKEND_URL in your Vercel environment variables to:
 *   https://intelligent-email-assistant-api.onrender.com
 * For local dev leave it unset (empty string = same-origin Express server).
 */
const API_BASE: string =
  (typeof import.meta !== "undefined" && (import.meta as any).env?.VITE_BACKEND_URL) || "";

async function customFetch(input: string, init: RequestInit = {}): Promise<Response> {
  const url = input.startsWith("/") ? `${API_BASE}${input}` : input;
  const headers = new Headers(init.headers || {});
  const sessionId = getStoredSessionId();

  if (sessionId) {
    headers.set("x-session-id", sessionId);
    if (!headers.has("Authorization")) {
      headers.set("Authorization", `Bearer ${sessionId}`);
    }
  }

  try {
    const res = await fetch(url, {
      ...init,
      headers,
      credentials: "include",
    });

    if (res.status === 401) {
      setStoredSessionId(null);
    }

    return res;
  } catch (err: any) {
    // Convert raw network errors into friendly messages
    const message =
      err?.message === "Failed to fetch"
        ? "Backend unavailable. Please check your connection or try again."
        : err?.message || "Network error. Please try again.";
    throw new Error(message);
  }
}

export const api = {
  // Auth API
  async getSession(): Promise<SessionResponse> {
    try {
      const res = await customFetch("/api/auth/session");
      if (!res.ok) {
        setStoredSessionId(null);
        return {
          authenticated: false,
          user: null,
          isDemo: false,
          isRealGoogleConnected: false,
          sessionId: null,
        };
      }
      const data: SessionResponse = await res.json();
      if (data.authenticated && data.sessionId) {
        setStoredSessionId(data.sessionId);
      } else if (!data.authenticated) {
        setStoredSessionId(null);
      }
      return data;
    } catch {
      setStoredSessionId(null);
      // Never propagate "Failed to fetch" as a crash — return unauthenticated gracefully
      return {
        authenticated: false,
        user: null,
        isDemo: false,
        isRealGoogleConnected: false,
        sessionId: null,
      };
    }
  },

  async getGoogleOAuthUrl(): Promise<{ url: string; redirectUri: string }> {
    try {
      const res = await customFetch("/api/auth/google/url");
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Failed to generate Google OAuth URL");
      }
      return res.json();
    } catch (err: any) {
      throw new Error(err.message || "Google authentication failed. Please try again.");
    }
  },

  async loginDemo(): Promise<{ success: boolean; user: User; isDemo: boolean; sessionId: string }> {
    const res = await customFetch("/api/auth/demo-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to log in to demo mode");
    }
    const data = await res.json();
    if (data.sessionId) {
      setStoredSessionId(data.sessionId);
    }
    return data;
  },

  async logout(): Promise<void> {
    try {
      await customFetch("/api/auth/logout", {
        method: "POST",
      });
    } finally {
      setStoredSessionId(null);
    }
  },

  // Email API
  async getEmails(params: {
    folder?: FolderType;
    q?: string;
    unread?: boolean;
    starred?: boolean;
    pageToken?: string;
  } = {}): Promise<{ messages: EmailMessage[]; nextPageToken?: string; total: number; isDemo: boolean }> {
    const query = new URLSearchParams();
    if (params.folder) query.set("folder", params.folder);
    if (params.q) query.set("q", params.q);
    if (params.unread) query.set("unread", "true");
    if (params.starred) query.set("starred", "true");
    if (params.pageToken) query.set("pageToken", params.pageToken);

    const res = await customFetch(`/api/emails?${query.toString()}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to fetch emails");
    }
    return res.json();
  },

  async getEmailById(id: string): Promise<{ email: EmailMessage; thread?: EmailThread }> {
    const res = await customFetch(`/api/emails/${id}`);
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to fetch email details");
    }
    return res.json();
  },

  async updateEmailLabel(
    id: string,
    action: "read" | "star" | "archive",
    value: boolean
  ): Promise<{ success: boolean; email: EmailMessage }> {
    const res = await customFetch(`/api/emails/${id}/labels`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action, value }),
    });
    if (!res.ok) throw new Error("Failed to update email label");
    return res.json();
  },

  async trashEmail(id: string): Promise<void> {
    const res = await customFetch(`/api/emails/${id}/trash`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to move email to trash");
  },

  async untrashEmail(id: string): Promise<void> {
    const res = await customFetch(`/api/emails/${id}/untrash`, {
      method: "POST",
    });
    if (!res.ok) throw new Error("Failed to restore email from trash");
  },

  async deleteEmailPermanently(id: string): Promise<void> {
    const res = await customFetch(`/api/emails/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) throw new Error("Failed to delete email permanently");
  },

  async sendEmail(payload: {
    to: string;
    cc?: string;
    bcc?: string;
    subject: string;
    body: string;
    threadId?: string;
    inReplyTo?: string;
  }): Promise<{ success: boolean; message: string; email?: EmailMessage }> {
    const res = await customFetch("/api/emails/send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to send email");
    }
    return res.json();
  },

  // AI API
  async summarizeEmail(payload: {
    subject: string;
    sender: string;
    body: string;
    emailId?: string;
    threadHistory?: Array<{ sender: string; body: string; date: string }>;
  }): Promise<AISummary> {
    const res = await customFetch("/api/ai/summarize", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to generate AI summary");
    }
    const data = await res.json();
    return data.result;
  },

  async generateReply(payload: {
    subject: string;
    sender: string;
    body: string;
    tone?: ReplyTone;
    userInstructions?: string;
    userDraft?: string;
    keyPointsToInclude?: string[];
    emailId?: string;
  }): Promise<AIReply> {
    const res = await customFetch("/api/ai/reply", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to generate AI reply");
    }
    const data = await res.json();
    return data.result;
  },

  async explainEmail(payload: {
    subject: string;
    sender: string;
    body: string;
    emailId?: string;
  }): Promise<AIExplain> {
    const res = await customFetch("/api/ai/explain", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to explain email");
    }
    const data = await res.json();
    return data.result;
  },

  async enhanceText(payload: {
    text: string;
    mode: TextEnhanceMode;
  }): Promise<{ enhancedText: string; improvements: string[] }> {
    const res = await customFetch("/api/ai/enhance", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || "Failed to enhance text");
    }
    const data = await res.json();
    return data.result;
  },

  async generateSubjectLines(payload: {
    body: string;
    currentSubject?: string;
  }): Promise<{ subjects: string[] }> {
    const res = await customFetch("/api/ai/generate-subject", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) throw new Error("Failed to generate subject lines");
    const data = await res.json();
    return data.result;
  },

  async smartSearch(query: string): Promise<{ gmailQuery: string; explanation: string }> {
    const res = await customFetch("/api/ai/smart-search", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ query }),
    });
    if (!res.ok) throw new Error("Smart search query generation failed");
    const data = await res.json();
    return data.result;
  },

  // Activities & Status
  async getActivities(): Promise<EmailActivity[]> {
    const res = await customFetch("/api/activities");
    if (!res.ok) throw new Error("Failed to fetch activity logs");
    const data = await res.json();
    return data.activities || [];
  },

  async getSystemStatus(): Promise<SystemStatus> {
    try {
      const res = await customFetch("/api/system/status");
      if (!res.ok) throw new Error("Failed to fetch system status");
      return res.json();
    } catch (err: any) {
      // Return a safe degraded status rather than crashing the app
      throw new Error(err.message || "Backend unavailable. Please try again.");
    }
  },

  async getSupabaseSchemaSql(): Promise<string> {
    const res = await customFetch("/api/system/schema-sql");
    return res.text();
  },
};
