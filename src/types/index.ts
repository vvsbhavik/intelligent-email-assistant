export interface User {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture?: string;
  created_at?: string;
  updated_at?: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailAddress {
  name: string;
  email: string;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId?: string;
  internalDate: string;
  from: EmailAddress;
  to: EmailAddress[];
  cc?: EmailAddress[];
  bcc?: EmailAddress[];
  subject: string;
  date: string;
  bodyText: string;
  bodyHtml: string;
  attachments?: EmailAttachment[];
  isRead: boolean;
  isStarred: boolean;
  isArchived: boolean;
  isDraft?: boolean;
  isTrash?: boolean;
  aiPriority?: "high" | "medium" | "low";
  aiCategory?: "Urgent" | "Work" | "Finance" | "Personal" | "Newsletter" | "Support";
}

export interface EmailThread {
  id: string;
  historyId?: string;
  messages: EmailMessage[];
}

export interface AISummary {
  summary: string;
  keyPoints: string[];
  actionItems: string[];
  sentiment: "positive" | "neutral" | "urgent" | "negative";
  priority: "high" | "medium" | "low";
  priorityReason: string;
  estimatedReadTime: string;
}

export interface AIReply {
  replySubject: string;
  replyBody: string;
  alternativeTones?: Array<{
    tone: string;
    preview: string;
  }>;
}

export interface AIExplain {
  simplifiedExplanation: string;
  whatTheyWant: string;
  whatYouShouldDo: string;
  potentialRisksOrCatches: string[];
  keyTermsDefined: Array<{ term: string; definition: string }>;
}

export interface EmailActivity {
  id: string;
  user_id: string;
  email_id: string;
  action: string;
  metadata: Record<string, any>;
  created_at: string;
}

export interface SystemStatus {
  gemini: {
    status: "connected" | "missing_key";
    model: string;
  };
  googleOAuth: {
    status: "configured" | "credentials_needed";
    clientIdConfigured: boolean;
  };
  supabase: {
    status: "connected" | "local_fallback";
    hasUrl: boolean;
  };
  version: string;
}

export type FolderType = "inbox" | "starred" | "sent" | "drafts" | "archive" | "trash";
export type ReplyTone = "professional" | "friendly" | "formal" | "concise" | "direct" | "urgent";
export type TextEnhanceMode = "fix_grammar" | "professional" | "friendly" | "concise" | "expand" | "assertive";
