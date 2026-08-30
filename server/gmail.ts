/**
 * Gmail API & Google OAuth Integration Layer
 * Production-ready REST calls to https://gmail.googleapis.com/gmail/v1/users/me
 * with complete OAuth 2.0 PKCE / Authorization Code support and rich sandbox fallback.
 */

export interface EmailHeader {
  name: string;
  value: string;
}

export interface EmailAttachment {
  id: string;
  filename: string;
  mimeType: string;
  size: number;
}

export interface EmailMessage {
  id: string;
  threadId: string;
  labelIds: string[];
  snippet: string;
  historyId?: string;
  internalDate: string;
  from: {
    name: string;
    email: string;
  };
  to: {
    name: string;
    email: string;
  }[];
  cc?: {
    name: string;
    email: string;
  }[];
  bcc?: {
    name: string;
    email: string;
  }[];
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
  // Computed AI tags & priority for instant user visibility
  aiPriority?: "high" | "medium" | "low";
  aiCategory?: "Urgent" | "Work" | "Finance" | "Personal" | "Newsletter" | "Support";
}

export interface EmailThread {
  id: string;
  historyId?: string;
  messages: EmailMessage[];
}

export interface GoogleUserProfile {
  id: string;
  email: string;
  name: string;
  given_name?: string;
  family_name?: string;
  picture?: string;
}

export interface OAuthTokens {
  access_token: string;
  refresh_token?: string;
  expires_in: number;
  scope: string;
  token_type: string;
  expiry_date?: number;
}

// Scopes required for complete Gmail functionality
export const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/userinfo.email",
  "https://www.googleapis.com/auth/userinfo.profile",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.labels",
].join(" ");

export function getGoogleOAuthURL(redirectUri: string, state: string = "state_gmail_auth"): string {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured in environment variables.");
  }

  const rootUrl = "https://accounts.google.com/o/oauth2/v2/auth";
  const options = {
    redirect_uri: redirectUri,
    client_id: clientId,
    access_type: "offline",
    response_type: "code",
    prompt: "consent",
    scope: GMAIL_SCOPES,
    state,
  };

  const qs = new URLSearchParams(options);
  return `${rootUrl}?${qs.toString()}`;
}

export async function exchangeCodeForTokens(code: string, redirectUri: string): Promise<OAuthTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: "authorization_code",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || data.error || "Failed to exchange Google OAuth code.");
  }

  return {
    ...data,
    expiry_date: Date.now() + (data.expires_in || 3600) * 1000,
  };
}

export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;

  if (!clientId || !clientSecret) {
    throw new Error("GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET is missing.");
  }

  const response = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      refresh_token: refreshToken,
      client_id: clientId,
      client_secret: clientSecret,
      grant_type: "refresh_token",
    }),
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error_description || "Failed to refresh Google token.");
  }

  return {
    ...data,
    expiry_date: Date.now() + (data.expires_in || 3600) * 1000,
  };
}

export async function getGoogleUserProfile(accessToken: string): Promise<GoogleUserProfile> {
  const response = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    throw new Error("Failed to fetch Google user profile.");
  }

  return await response.json();
}

/**
 * Real Gmail API Message parsing helpers
 */
function parseEmailAddress(raw: string): { name: string; email: string } {
  if (!raw) return { name: "", email: "" };
  const match = raw.match(/(.*?)\s*<([^>]+)>/);
  if (match) {
    return {
      name: match[1].replace(/["']/g, "").trim() || match[2],
      email: match[2].trim(),
    };
  }
  return { name: raw.trim(), email: raw.trim() };
}

function parseEmailAddresses(raw: string): { name: string; email: string }[] {
  if (!raw) return [];
  return raw.split(",").map(parseEmailAddress);
}

function decodeBase64Url(base64Url: string): string {
  if (!base64Url) return "";
  try {
    const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
    return Buffer.from(base64, "base64").toString("utf-8");
  } catch {
    return "";
  }
}

function extractEmailBody(payload: any): { text: string; html: string; attachments: EmailAttachment[] } {
  let text = "";
  let html = "";
  const attachments: EmailAttachment[] = [];

  function traverseParts(part: any) {
    if (!part) return;

    if (part.filename && part.body && (part.body.attachmentId || part.body.size > 0)) {
      attachments.push({
        id: part.body.attachmentId || part.partId || Math.random().toString(),
        filename: part.filename,
        mimeType: part.mimeType || "application/octet-stream",
        size: part.body.size || 0,
      });
    }

    if (part.mimeType === "text/plain" && part.body?.data) {
      text += decodeBase64Url(part.body.data);
    } else if (part.mimeType === "text/html" && part.body?.data) {
      html += decodeBase64Url(part.body.data);
    }

    if (part.parts && Array.isArray(part.parts)) {
      part.parts.forEach(traverseParts);
    }
  }

  traverseParts(payload);

  if (!text && html) {
    text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  }

  return { text, html: html || `<p>${text.replace(/\n/g, "<br/>")}</p>`, attachments };
}

export function formatGmailMessage(msg: any): EmailMessage {
  const headers: Record<string, string> = {};
  if (msg.payload?.headers) {
    for (const h of msg.payload.headers) {
      headers[h.name.toLowerCase()] = h.value;
    }
  }

  const { text, html, attachments } = extractEmailBody(msg.payload);
  const labelIds: string[] = msg.labelIds || [];

  const from = parseEmailAddress(headers["from"] || "");
  const to = parseEmailAddresses(headers["to"] || "");
  const cc = parseEmailAddresses(headers["cc"] || "");
  const bcc = parseEmailAddresses(headers["bcc"] || "");
  const subject = headers["subject"] || "(No Subject)";
  const date = headers["date"] || new Date(parseInt(msg.internalDate || `${Date.now()}`)).toISOString();

  const isRead = !labelIds.includes("UNREAD");
  const isStarred = labelIds.includes("STARRED");
  const isTrash = labelIds.includes("TRASH");
  const isDraft = labelIds.includes("DRAFT");
  const isArchived = !labelIds.includes("INBOX") && !isTrash && !isDraft;

  // Basic priority heuristic
  const isHighPriority =
    subject.toLowerCase().includes("urgent") ||
    subject.toLowerCase().includes("action required") ||
    subject.toLowerCase().includes("asap") ||
    isStarred;

  return {
    id: msg.id,
    threadId: msg.threadId,
    labelIds,
    snippet: msg.snippet || text.slice(0, 160),
    internalDate: msg.internalDate || `${Date.now()}`,
    from,
    to,
    cc,
    bcc,
    subject,
    date,
    bodyText: text || msg.snippet || "",
    bodyHtml: html,
    attachments,
    isRead,
    isStarred,
    isArchived,
    isDraft,
    isTrash,
    aiPriority: isHighPriority ? "high" : "medium",
    aiCategory: subject.toLowerCase().includes("invoice") ? "Finance" : isHighPriority ? "Urgent" : "Work",
  };
}

/**
 * Real Gmail API Requests
 */
export async function listGmailMessages(
  accessToken: string,
  options: {
    q?: string;
    labelIds?: string[];
    maxResults?: number;
    pageToken?: string;
  } = {}
): Promise<{ messages: EmailMessage[]; nextPageToken?: string; resultSizeEstimate: number }> {
  const url = new URL("https://gmail.googleapis.com/gmail/v1/users/me/messages");
  if (options.q) url.searchParams.set("q", options.q);
  if (options.labelIds && options.labelIds.length > 0) {
    options.labelIds.forEach((label) => url.searchParams.append("labelIds", label));
  }
  url.searchParams.set("maxResults", `${options.maxResults || 25}`);
  if (options.pageToken) url.searchParams.set("pageToken", options.pageToken);

  const response = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to list Gmail messages");
  }

  const data = await response.json();
  const rawList: { id: string; threadId: string }[] = data.messages || [];

  // Fetch full message details in parallel batches of 10
  const messages: EmailMessage[] = [];
  const chunkSize = 10;
  for (let i = 0; i < rawList.length; i += chunkSize) {
    const chunk = rawList.slice(i, i + chunkSize);
    const chunkResults = await Promise.all(
      chunk.map(async (item) => {
        try {
          const detailRes = await fetch(
            `https://gmail.googleapis.com/gmail/v1/users/me/messages/${item.id}?format=full`,
            {
              headers: { Authorization: `Bearer ${accessToken}` },
            }
          );
          if (!detailRes.ok) return null;
          const msgJson = await detailRes.json();
          return formatGmailMessage(msgJson);
        } catch {
          return null;
        }
      })
    );
    messages.push(...(chunkResults.filter(Boolean) as EmailMessage[]));
  }

  return {
    messages,
    nextPageToken: data.nextPageToken,
    resultSizeEstimate: data.resultSizeEstimate || messages.length,
  };
}

export async function getGmailMessage(accessToken: string, messageId: string): Promise<EmailMessage> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Gmail message details");
  }

  const json = await response.json();
  return formatGmailMessage(json);
}

export async function getGmailThread(accessToken: string, threadId: string): Promise<EmailThread> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/threads/${threadId}?format=full`,
    {
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );

  if (!response.ok) {
    throw new Error("Failed to fetch Gmail thread details");
  }

  const json = await response.json();
  const messages = (json.messages || []).map(formatGmailMessage);
  return {
    id: json.id,
    historyId: json.historyId,
    messages,
  };
}

export async function modifyGmailLabels(
  accessToken: string,
  messageId: string,
  addLabelIds: string[] = [],
  removeLabelIds: string[] = []
): Promise<EmailMessage> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/modify`,
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ addLabelIds, removeLabelIds }),
    }
  );

  if (!response.ok) {
    throw new Error("Failed to update Gmail message labels");
  }

  const json = await response.json();
  return formatGmailMessage(json);
}

export async function trashGmailMessage(accessToken: string, messageId: string): Promise<void> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/trash`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!response.ok) {
    throw new Error("Failed to move email to trash");
  }
}

export async function untrashGmailMessage(accessToken: string, messageId: string): Promise<void> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}/untrash`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!response.ok) {
    throw new Error("Failed to restore email from trash");
  }
}

export async function deleteGmailMessage(accessToken: string, messageId: string): Promise<void> {
  const response = await fetch(
    `https://gmail.googleapis.com/gmail/v1/users/me/messages/${messageId}`,
    {
      method: "DELETE",
      headers: { Authorization: `Bearer ${accessToken}` },
    }
  );
  if (!response.ok) {
    throw new Error("Failed to permanently delete email");
  }
}

export interface SendEmailPayload {
  to: string;
  cc?: string;
  bcc?: string;
  subject: string;
  body: string;
  inReplyTo?: string;
  references?: string;
  threadId?: string;
}

export async function sendGmailEmail(accessToken: string, payload: SendEmailPayload): Promise<{ id: string; threadId: string }> {
  // Construct RFC 2822 email message
  const lines: string[] = [
    `To: ${payload.to}`,
    payload.cc ? `Cc: ${payload.cc}` : "",
    payload.bcc ? `Bcc: ${payload.bcc}` : "",
    `Subject: =?utf-8?B?${Buffer.from(payload.subject, "utf-8").toString("base64")}?=`,
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    payload.inReplyTo ? `In-Reply-To: ${payload.inReplyTo}` : "",
    payload.references ? `References: ${payload.references}` : "",
    "",
    payload.body.includes("<") ? payload.body : payload.body.replace(/\n/g, "<br/>"),
  ].filter(Boolean);

  const rawRfc = lines.join("\r\n");
  const rawBase64Url = Buffer.from(rawRfc, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const bodyData: any = { raw: rawBase64Url };
  if (payload.threadId) bodyData.threadId = payload.threadId;

  const response = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/messages/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyData),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to send email through Gmail API");
  }

  return await response.json();
}

export async function saveGmailDraft(accessToken: string, payload: SendEmailPayload, draftId?: string): Promise<{ id: string; message: { id: string; threadId: string } }> {
  const lines: string[] = [
    payload.to ? `To: ${payload.to}` : "",
    payload.cc ? `Cc: ${payload.cc}` : "",
    payload.bcc ? `Bcc: ${payload.bcc}` : "",
    payload.subject ? `Subject: =?utf-8?B?${Buffer.from(payload.subject, "utf-8").toString("base64")}?=` : "",
    "MIME-Version: 1.0",
    'Content-Type: text/html; charset="UTF-8"',
    "Content-Transfer-Encoding: base64",
    payload.inReplyTo ? `In-Reply-To: ${payload.inReplyTo}` : "",
    payload.references ? `References: ${payload.references}` : "",
    "",
    payload.body.includes("<") ? payload.body : payload.body.replace(/\n/g, "<br/>"),
  ].filter(Boolean);

  const rawRfc = lines.join("\r\n");
  const rawBase64Url = Buffer.from(rawRfc, "utf-8")
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

  const bodyData: any = { message: { raw: rawBase64Url } };
  if (payload.threadId) bodyData.message.threadId = payload.threadId;

  let url = "https://gmail.googleapis.com/gmail/v1/users/me/drafts";
  let method = "POST";

  let resolvedDraftId = draftId;

  // If a draftId is provided, we might need to check if it's actually a messageId
  // and resolve the real draftId if the user is editing an existing draft from the UI.
  if (resolvedDraftId) {
    try {
      const listRes = await fetch("https://gmail.googleapis.com/gmail/v1/users/me/drafts", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (listRes.ok) {
        const listData = await listRes.json();
        const found = listData.drafts?.find((d: any) => d.message?.id === resolvedDraftId || d.id === resolvedDraftId);
        if (found) {
          resolvedDraftId = found.id;
          url = `https://gmail.googleapis.com/gmail/v1/users/me/drafts/${resolvedDraftId}`;
          method = "PUT";
        } else {
          // It's a new draft based on a thread, not an existing draft
          resolvedDraftId = undefined;
        }
      }
    } catch (e) {
      console.warn("Could not resolve draft ID, creating new draft.");
      resolvedDraftId = undefined;
    }
  }

  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(bodyData),
  });

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.error?.message || "Failed to save draft through Gmail API");
  }

  return await response.json();
}

/**
 * Rich Sandbox / Demo In-Memory Store
 * Used when testing without live Google OAuth keys or in demo mode.
 */
let demoEmails: EmailMessage[] = [
  {
    id: "msg-101",
    threadId: "th-101",
    labelIds: ["INBOX", "UNREAD"],
    snippet: "Hi Alex, please find the revised Q3 Financial Forecast & Product Roadmap attached for executive sign-off.",
    internalDate: `${Date.now() - 1000 * 60 * 25}`, // 25 mins ago
    from: { name: "Elena Rostova", email: "elena.rostova@techcorp.io" },
    to: [{ name: "Alex Mercer", email: "alex.mercer@gmail.com" }],
    subject: "Urgent: Q3 Financial Forecast & Product Roadmap Sign-Off",
    date: new Date(Date.now() - 1000 * 60 * 25).toISOString(),
    bodyText: `Hi Alex,\n\nI hope you're having a productive week.\n\nAttached is the revised Q3 Financial Forecast and Engineering Roadmap. We need executive sign-off before Thursday 5:00 PM EST to lock in hiring plans for the upcoming quarter.\n\nKey changes from last draft:\n1. Server infrastructure cost adjusted by -$42k with cloud optimization.\n2. Machine learning engineer headcount brought forward to July.\n3. Mobile app 2.0 release date targeted for August 28th.\n\nPlease review section 4 on budget allocations and reply with your approval or requested revisions.\n\nBest regards,\nElena Rostova\nVP of Finance & Operations\nTechCorp Global`,
    bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
      <p>Hi Alex,</p>
      <p>I hope you're having a productive week.</p>
      <p>Attached is the revised <strong>Q3 Financial Forecast and Engineering Roadmap</strong>. We need executive sign-off before <strong>Thursday 5:00 PM EST</strong> to lock in hiring plans for the upcoming quarter.</p>
      <p><strong>Key changes from last draft:</strong></p>
      <ul>
        <li>Server infrastructure cost adjusted by -$42k with cloud optimization.</li>
        <li>Machine learning engineer headcount brought forward to July.</li>
        <li>Mobile app 2.0 release date targeted for August 28th.</li>
      </ul>
      <p>Please review section 4 on budget allocations and reply with your approval or requested revisions.</p>
      <p style="margin-top: 24px;">Best regards,<br/><strong>Elena Rostova</strong><br/>VP of Finance & Operations<br/>TechCorp Global</p>
    </div>`,
    attachments: [
      { id: "att-1", filename: "Q3_Financial_Forecast_v3.pdf", mimeType: "application/pdf", size: 2450000 },
      { id: "att-2", filename: "Engineering_Hiring_Matrix.xlsx", mimeType: "application/vnd.ms-excel", size: 540000 },
    ],
    isRead: false,
    isStarred: true,
    isArchived: false,
    aiPriority: "high",
    aiCategory: "Urgent",
  },
  {
    id: "msg-102",
    threadId: "th-102",
    labelIds: ["INBOX"],
    snippet: "Thanks for meeting today! Here are the agreed next steps for integrating Google Cloud Gemini into the workflow.",
    internalDate: `${Date.now() - 1000 * 60 * 180}`, // 3 hours ago
    from: { name: "Marcus Sterling", email: "marcus@cloudsolutions.com" },
    to: [{ name: "Alex Mercer", email: "alex.mercer@gmail.com" }],
    subject: "Meeting Recap: Gemini AI Architecture & API Integration",
    date: new Date(Date.now() - 1000 * 60 * 180).toISOString(),
    bodyText: `Alex,\n\nGreat discussion earlier regarding the AI email assistant architecture. As agreed, here is what we established:\n\n- Backend: Node.js Express server running @google/genai SDK with gemini-3.7-flash.\n- Data: Supabase PostgreSQL for user session activities and audit logs.\n- Security: OAuth 2.0 tokens strictly kept on the server.\n\nCould you confirm if you'd like us to prepare the staging API gateway keys for your team by Friday?\n\nCheers,\nMarcus`,
    bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
      <p>Alex,</p>
      <p>Great discussion earlier regarding the AI email assistant architecture. As agreed, here is what we established:</p>
      <ul>
        <li><strong>Backend:</strong> Node.js Express server running <code>@google/genai</code> SDK with <code>gemini-3.7-flash</code>.</li>
        <li><strong>Data:</strong> Supabase PostgreSQL for user session activities and audit logs.</li>
        <li><strong>Security:</strong> OAuth 2.0 tokens strictly kept on the server.</li>
      </ul>
      <p>Could you confirm if you'd like us to prepare the staging API gateway keys for your team by Friday?</p>
      <p>Cheers,<br/><strong>Marcus Sterling</strong></p>
    </div>`,
    isRead: true,
    isStarred: false,
    isArchived: false,
    aiPriority: "medium",
    aiCategory: "Work",
  },
  {
    id: "msg-103",
    threadId: "th-103",
    labelIds: ["INBOX"],
    snippet: "Your monthly invoice #INV-2026-8849 for Google Cloud Platform services is now available for download.",
    internalDate: `${Date.now() - 1000 * 60 * 60 * 8}`, // 8 hours ago
    from: { name: "Google Cloud Billing", email: "billing-noreply@google.com" },
    to: [{ name: "Alex Mercer", email: "alex.mercer@gmail.com" }],
    subject: "Google Cloud Invoice #INV-2026-8849 ($142.50 USD)",
    date: new Date(Date.now() - 1000 * 60 * 60 * 8).toISOString(),
    bodyText: `Your monthly statement for Google Cloud Platform is ready. Total amount charged: $142.50 USD to Visa ending in 4242. No further action is required.`,
    bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
      <p>Your monthly statement for <strong>Google Cloud Platform</strong> is ready.</p>
      <p><strong>Total amount charged:</strong> $142.50 USD<br/><strong>Payment Method:</strong> Visa ending in 4242</p>
      <p>No further action is required. You can download the PDF receipt from your billing console.</p>
    </div>`,
    attachments: [
      { id: "att-3", filename: "Invoice_INV_2026_8849.pdf", mimeType: "application/pdf", size: 120000 },
    ],
    isRead: true,
    isStarred: false,
    isArchived: false,
    aiPriority: "low",
    aiCategory: "Finance",
  },
  {
    id: "msg-104",
    threadId: "th-104",
    labelIds: ["INBOX", "UNREAD"],
    snippet: "Hey Alex! Would love to get your feedback on the new landing page UI designs before tomorrow's client presentation.",
    internalDate: `${Date.now() - 1000 * 60 * 60 * 14}`, // 14 hours ago
    from: { name: "Sophia Chen", email: "sophia.design@studio9.co" },
    to: [{ name: "Alex Mercer", email: "alex.mercer@gmail.com" }],
    subject: "Feedback Request: Landing Page UI Iteration 4",
    date: new Date(Date.now() - 1000 * 60 * 60 * 14).toISOString(),
    bodyText: `Hey Alex!\n\nI just pushed the revised design mockups for the landing page with high-contrast typography and subtle glass highlights as you suggested.\n\nCould you take 5 minutes to review the hero layout and let me know if we can ship this to development?\n\nFigma link is embedded in the project dashboard.\n\nThanks!\nSophia`,
    bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
      <p>Hey Alex!</p>
      <p>I just pushed the revised design mockups for the landing page with high-contrast typography and subtle glass highlights as you suggested.</p>
      <p>Could you take 5 minutes to review the hero layout and let me know if we can ship this to development?</p>
      <p>Figma link is embedded in the project dashboard.</p>
      <p>Thanks!<br/><strong>Sophia Chen</strong></p>
    </div>`,
    isRead: false,
    isStarred: true,
    isArchived: false,
    aiPriority: "high",
    aiCategory: "Work",
  },
  {
    id: "msg-105",
    threadId: "th-105",
    labelIds: ["INBOX"],
    snippet: "Your flight confirmation for San Francisco (SFO) to Tokyo (HND) on September 15, 2026. Booking Reference: 7KJ94X.",
    internalDate: `${Date.now() - 1000 * 60 * 60 * 28}`,
    from: { name: "All Nippon Airways", email: "reservations@ana.co.jp" },
    to: [{ name: "Alex Mercer", email: "alex.mercer@gmail.com" }],
    subject: "Flight Confirmation: SFO -> HND (Booking #7KJ94X)",
    date: new Date(Date.now() - 1000 * 60 * 60 * 28).toISOString(),
    bodyText: `Flight Confirmation for Alex Mercer.\nDeparture: SFO - 11:30 AM (Sep 15)\nArrival: HND - 3:45 PM (Sep 16)\nSeat: 14A (Window)\nStatus: Confirmed`,
    bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
      <h3 style="color: #0284c7;">Flight Confirmed: San Francisco (SFO) &rarr; Tokyo Haneda (HND)</h3>
      <p><strong>Passenger:</strong> Alex Mercer<br/><strong>Booking Reference:</strong> 7KJ94X<br/><strong>Seat:</strong> 14A (Window)</p>
      <p><strong>Departure:</strong> September 15, 2026 - 11:30 AM<br/><strong>Arrival:</strong> September 16, 2026 - 3:45 PM (+1 day)</p>
    </div>`,
    isRead: true,
    isStarred: false,
    isArchived: false,
    aiPriority: "medium",
    aiCategory: "Personal",
  },
  {
    id: "msg-106",
    threadId: "th-106",
    labelIds: ["INBOX"],
    snippet: "Discover what's new in AI Studio, Gemini 3.7 multimodal capabilities, and latest developer tooling updates.",
    internalDate: `${Date.now() - 1000 * 60 * 60 * 48}`,
    from: { name: "AI Dev Weekly", email: "newsletter@aidevweekly.io" },
    to: [{ name: "Alex Mercer", email: "alex.mercer@gmail.com" }],
    subject: "Issue #142: Gemini 3.7 Flash, Serverless AI, and the Future of Email",
    date: new Date(Date.now() - 1000 * 60 * 60 * 48).toISOString(),
    bodyText: `Welcome to Issue #142 of AI Dev Weekly!\n\nThis week we cover:\n1. Building intelligent client assistants with Node.js and Gemini SDK.\n2. Supabase PostgreSQL real-time synchronization patterns.\n3. How LLMs are transforming executive inbox zero workflows.\n\nEnjoy the read!`,
    bodyHtml: `<div style="font-family: sans-serif; line-height: 1.6; color: #1e293b;">
      <h2>AI Dev Weekly &bull; Issue #142</h2>
      <p>Welcome back! This week's top stories:</p>
      <ol>
        <li><strong>Building Intelligent Assistants:</strong> How modern agents leverage Gemini 3.7 for instantaneous email comprehension.</li>
        <li><strong>Supabase PostgreSQL:</strong> Best practices for storing user activity logs and audit trails.</li>
        <li><strong>Inbox Zero in 2026:</strong> The transition from manual filters to contextual neural summarization.</li>
      </ol>
    </div>`,
    isRead: true,
    isStarred: false,
    isArchived: false,
    aiPriority: "low",
    aiCategory: "Newsletter",
  }
];

export function getDemoEmails(filter: {
  folder?: string;
  query?: string;
  unreadOnly?: boolean;
  starredOnly?: boolean;
}): EmailMessage[] {
  let list = [...demoEmails];

  if (filter.folder === "starred") {
    list = list.filter((m) => m.isStarred && !m.isTrash);
  } else if (filter.folder === "sent") {
    list = list.filter((m) => m.labelIds.includes("SENT") && !m.isTrash);
  } else if (filter.folder === "drafts") {
    list = list.filter((m) => m.isDraft && !m.isTrash);
  } else if (filter.folder === "trash") {
    list = list.filter((m) => m.isTrash);
  } else if (filter.folder === "archive") {
    list = list.filter((m) => m.isArchived && !m.isTrash);
  } else {
    // Default inbox
    list = list.filter((m) => !m.isArchived && !m.isTrash && !m.isDraft);
  }

  if (filter.unreadOnly) {
    list = list.filter((m) => !m.isRead);
  }
  if (filter.starredOnly) {
    list = list.filter((m) => m.isStarred);
  }

  if (filter.query) {
    const q = filter.query.toLowerCase();
    list = list.filter(
      (m) =>
        m.subject.toLowerCase().includes(q) ||
        m.from.name.toLowerCase().includes(q) ||
        m.from.email.toLowerCase().includes(q) ||
        m.snippet.toLowerCase().includes(q) ||
        m.bodyText.toLowerCase().includes(q)
    );
  }

  // Sort descending by internalDate
  return list.sort((a, b) => parseInt(b.internalDate) - parseInt(a.internalDate));
}

export function updateDemoEmail(
  id: string,
  updater: (email: EmailMessage) => EmailMessage
): EmailMessage | null {
  const idx = demoEmails.findIndex((e) => e.id === id);
  if (idx === -1) return null;
  demoEmails[idx] = updater(demoEmails[idx]);
  return demoEmails[idx];
}

export function addDemoEmail(email: Omit<EmailMessage, "id" | "internalDate">): EmailMessage {
  const newMsg: EmailMessage = {
    ...email,
    id: `msg-${Date.now()}`,
    internalDate: `${Date.now()}`,
  };
  demoEmails.unshift(newMsg);
  return newMsg;
}

export function deleteDemoEmailPermanently(id: string): boolean {
  const initialLen = demoEmails.length;
  demoEmails = demoEmails.filter((e) => e.id !== id);
  return demoEmails.length < initialLen;
}
