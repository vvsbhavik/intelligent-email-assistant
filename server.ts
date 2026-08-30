import express, { Request, Response, NextFunction } from "express";
import path from "path";
import cookieParser from "cookie-parser";
import cors from "cors";
import dotenv from "dotenv";
import { createServer as createViteServer } from "vite";

import {
  summarizeEmail,
  generateReply,
  explainEmail,
  enhanceEmailText,
  generateSubjectLines,
  smartSearchQuery,
} from "./server/gemini.ts";

import {
  getGoogleOAuthURL,
  exchangeCodeForTokens,
  getGoogleUserProfile,
  listGmailMessages,
  getGmailMessage,
  getGmailThread,
  modifyGmailLabels,
  trashGmailMessage,
  untrashGmailMessage,
  deleteGmailMessage,
  sendGmailEmail,
  getDemoEmails,
  updateDemoEmail,
  addDemoEmail,
  deleteDemoEmailPermanently,
  EmailMessage,
} from "./server/gmail.ts";

import {
  upsertUser,
  getUserById,
  logEmailActivity,
  getEmailActivities,
  getSupabase,
  SUPABASE_SCHEMA_SQL,
} from "./server/supabase.ts";

dotenv.config();

const app = express();
const PORT = 3000;

// ─── CORS ──────────────────────────────────────────────────────────────────
// Explicit known-good origins (hardcoded so they work even if env var is missing)
const allowedOrigins: string[] = [
  "http://localhost:3000",
  "http://localhost:5173",
  // Production & preview Vercel deployments for this project
  "https://intelligent-email-assistant-two.vercel.app",
  "https://intelligent-email-assistant.vercel.app",
  "https://intelligent-email-assistant-4d4z7ghjs-vvsbhaviks-projects.vercel.app",
  "https://intelligent-email-assistant-fktda4ggh-vvsbhaviks-projects.vercel.app",
  "https://intelligent-email-assistant-git-main-vvsbhaviks-projects.vercel.app",
];
// Also include FRONTEND_URL env var when set (e.g. for future custom domains)
if (process.env.FRONTEND_URL && !allowedOrigins.includes(process.env.FRONTEND_URL)) {
  allowedOrigins.push(process.env.FRONTEND_URL);
}

/**
 * Returns true for Vercel preview-deploy URLs that belong to this project.
 * Pattern: https://intelligent-email-assistant-<hash>-vvsbhaviks-projects.vercel.app
 */
function isAllowedVercelPreview(origin: string): boolean {
  return /^https:\/\/intelligent-email-assistant[a-z0-9-]*\.vercel\.app$/.test(origin);
}

const corsOptions: cors.CorsOptions = {
  origin: (origin, callback) => {
    // No origin = server-to-server / curl / same-origin – allow
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin) || isAllowedVercelPreview(origin)) {
      return callback(null, true);
    }
    callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Origin", "X-Requested-With", "Content-Type", "Accept", "Authorization"],
};

// Register ONCE – before all API routes
app.use(cors(corsOptions));
// Explicit OPTIONS preflight handler (same options)
app.options("*", cors(corsOptions));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));
app.use(cookieParser(process.env.SESSION_SECRET || "default-insecure-secret"));
// In-memory token store for sessions (keyed by sessionId)
interface SessionData {
  userId: string;
  user: {
    id: string;
    google_id: string;
    email: string;
    name: string;
    picture?: string;
  };
  accessToken?: string;
  refreshToken?: string;
  isDemo: boolean;
  createdAt: number;
}

const sessionStore = new Map<string, SessionData>();

// Session middleware
function getSession(req: Request): SessionData | null {
  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.substring(7).trim()
    : null;

  const sessionId = (req.headers["x-session-id"] as string) || bearerToken || req.signedCookies?.["iea_session"] || req.cookies?.["iea_session"];
  
  if (!sessionId) {
    console.log("[getSession] No sessionId found in headers, signedCookies, or cookies");
    return null;
  }

  let session = sessionStore.get(sessionId);
  if (!session && (sessionId.startsWith("sess_demo_") || sessionId === "demo_session")) {
    session = {
      userId: "demo-google-user-id-999",
      user: {
        id: "demo-google-user-id-999",
        google_id: "demo-google-user-id-999",
        email: "alex.mercer@gmail.com",
        name: "Alex Mercer (Demo)",
        picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
      },
      isDemo: true,
      createdAt: Date.now(),
    };
    sessionStore.set(sessionId, session);
  }

  if (!session) {
    console.log(`[getSession] SessionId ${sessionId} found, but no matching session in store`);
  }

  return session || null;
}

function requireAuth(req: Request, res: Response, next: NextFunction) {
  const session = getSession(req);
  if (!session) {
    return res.status(401).json({ error: "Unauthorized. Please sign in." });
  }
  (req as any).session = session;
  next();
}

/**
 * ----------------------------------------------------
 * AUTHENTICATION ROUTES
 * ----------------------------------------------------
 */

// Get current user session
app.get("/api/auth/session", (req: Request, res: Response) => {
  const session = getSession(req);
  if (!session) {
    return res.json({
      authenticated: false,
      user: null,
      isDemo: false,
      isRealGoogleConnected: false,
      sessionId: null,
    });
  }

  const authHeader = req.headers["authorization"];
  const bearerToken = authHeader && typeof authHeader === "string" && authHeader.startsWith("Bearer ")
    ? authHeader.substring(7).trim()
    : null;
  const sessionId = (req.headers["x-session-id"] as string) || bearerToken || req.signedCookies?.["iea_session"] || req.cookies?.["iea_session"];

  res.json({
    authenticated: true,
    user: session.user,
    isDemo: session.isDemo,
    sessionId: sessionId || "sess_demo_active",
  });
});

// Get Google OAuth Authorization URL
app.get("/api/auth/google/url", (req: Request, res: Response) => {
  try {
    const host = req.get("host") || `localhost:${PORT}`;
    const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const appUrl = process.env.BACKEND_URL || process.env.APP_URL || `${protocol}://${host}`;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    const url = getGoogleOAuthURL(redirectUri);
    res.json({ url, redirectUri });
  } catch (err: any) {
    res.status(400).json({ error: err.message });
  }
});

// Google OAuth Callback
app.get("/api/auth/google/callback", async (req: Request, res: Response) => {
  const frontendBase = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
  try {
    const error = req.query.error as string;
    if (error) {
      return res.redirect(`${frontendBase}/?error=${encodeURIComponent(error)}`);
    }

    const code = req.query.code as string;
    if (!code) {
      return res.redirect(`${frontendBase}/?error=no_code`);
    }

    const host = req.get("host") || `localhost:${PORT}`;
    const protocol = req.protocol === "https" || req.headers["x-forwarded-proto"] === "https" ? "https" : "http";
    const appUrl = process.env.BACKEND_URL || process.env.APP_URL || `${protocol}://${host}`;
    const redirectUri = `${appUrl}/api/auth/google/callback`;

    const tokens = await exchangeCodeForTokens(code, redirectUri);
    const profile = await getGoogleUserProfile(tokens.access_token);

    // Upsert user into Supabase
    const dbUser = await upsertUser({
      google_id: profile.id,
      email: profile.email,
      name: profile.name || profile.email.split("@")[0],
      picture: profile.picture,
    });

    // Create session
    const sessionId = `sess_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
    sessionStore.set(sessionId, {
      userId: dbUser.id,
      user: dbUser,
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      isDemo: false,
      createdAt: Date.now(),
    });

    await logEmailActivity(dbUser.id, "auth", "login_google", { email: dbUser.email });

    res.cookie("iea_session", sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      signed: true,
      maxAge: 30 * 24 * 60 * 60 * 1000,
    });
    res.redirect(frontendBase || "/");
  } catch (err: any) {
    console.error("OAuth callback error:", err);
    const frontendBase2 = (process.env.FRONTEND_URL || "").replace(/\/$/, "");
    res.redirect(`${frontendBase2}/?error=${encodeURIComponent(err.message || "OAuth exchange failed")}`);
  }
});

// 1-Click Sandbox / Demo Login
app.post("/api/auth/demo-login", async (req: Request, res: Response) => {
  try {
    const demoUser = await upsertUser({
      google_id: "demo-google-user-id-999",
      email: "alex.mercer@gmail.com",
      name: "Alex Mercer (Demo)",
      picture: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    });

    const sessionId = `sess_demo_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
    sessionStore.set(sessionId, {
      userId: demoUser.id,
      user: demoUser,
      isDemo: true,
      createdAt: Date.now(),
    });

    await logEmailActivity(demoUser.id, "auth", "login_demo", { mode: "sandbox" });

    res.cookie("iea_session", sessionId, {
      httpOnly: true,
      secure: true,
      sameSite: "none",
      signed: true,
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });
    res.json({
      success: true,
      user: demoUser,
      sessionId,
      isDemo: true,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
app.post("/api/auth/logout", requireAuth, async (req: Request, res: Response) => {
  const session = (req as any).session as SessionData;
  const sessionId = req.signedCookies?.["iea_session"] || req.cookies?.["iea_session"] || (req.headers["x-session-id"] as string);

  if (sessionId) {
    sessionStore.delete(sessionId);
  }

  await logEmailActivity(session.userId, "auth", "logout", {});

  res.clearCookie("iea_session", {
    httpOnly: true,
    secure: true,
    sameSite: "none",
    signed: true
  });
  res.json({ success: true });
});

/**
 * ----------------------------------------------------
 * EMAIL MANAGEMENT ROUTES
 * ----------------------------------------------------
 */

// List Emails
app.get("/api/emails", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session as SessionData;
    const folder = (req.query.folder as string) || "inbox";
    const query = (req.query.q as string) || "";
    const unreadOnly = req.query.unread === "true";
    const starredOnly = req.query.starred === "true";
    const pageToken = req.query.pageToken as string;

    if (session.isDemo || !session.accessToken) {
      // Return sandbox data
      const messages = getDemoEmails({
        folder,
        query,
        unreadOnly,
        starredOnly,
      });

      return res.json({
        messages,
        total: messages.length,
        isDemo: true,
      });
    }

    // Call Real Gmail API
    const labelIds: string[] = [];
    if (folder === "inbox") labelIds.push("INBOX");
    else if (folder === "starred") labelIds.push("STARRED");
    else if (folder === "sent") labelIds.push("SENT");
    else if (folder === "drafts") labelIds.push("DRAFT");
    else if (folder === "trash") labelIds.push("TRASH");

    let finalQuery = query;
    if (unreadOnly) finalQuery += " is:unread";
    if (starredOnly) finalQuery += " is:starred";

    const result = await listGmailMessages(session.accessToken, {
      q: finalQuery.trim() || undefined,
      labelIds: labelIds.length > 0 ? labelIds : undefined,
      pageToken,
      maxResults: 25,
    });

    res.json({
      messages: result.messages,
      nextPageToken: result.nextPageToken,
      total: result.resultSizeEstimate,
      isDemo: false,
    });
  } catch (err: any) {
    console.error("List emails error:", err);
    res.status(500).json({ error: err.message || "Failed to retrieve emails" });
  }
});

// Get Single Email & Thread
app.get("/api/emails/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session as SessionData;
    const { id } = req.params;

    if (session.isDemo || !session.accessToken) {
      const all = getDemoEmails({});
      const email = all.find((e) => e.id === id);
      if (!email) {
        return res.status(404).json({ error: "Email not found" });
      }

      // Automatically mark as read in demo
      updateDemoEmail(id, (e) => ({ ...e, isRead: true }));

      return res.json({
        email: { ...email, isRead: true },
        thread: {
          id: email.threadId,
          messages: [email],
        },
      });
    }

    const email = await getGmailMessage(session.accessToken, id);
    let thread = null;
    if (email.threadId) {
      try {
        thread = await getGmailThread(session.accessToken, email.threadId);
      } catch {
        thread = { id: email.threadId, messages: [email] };
      }
    }

    // Auto mark read if unread
    if (!email.isRead) {
      try {
        await modifyGmailLabels(session.accessToken, id, [], ["UNREAD"]);
      } catch (e) {
        // Non-fatal
      }
    }

    await logEmailActivity(session.userId, id, "view_email", { subject: email.subject });

    res.json({ email, thread });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch email" });
  }
});

// Modify Labels (Mark read/unread, star/unstar, archive)
app.post("/api/emails/:id/labels", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session as SessionData;
    const { id } = req.params;
    const { action, value } = req.body; // action: 'read' | 'star' | 'archive'

    if (session.isDemo || !session.accessToken) {
      const updated = updateDemoEmail(id, (email) => {
        const copy = { ...email };
        if (action === "read") copy.isRead = value;
        if (action === "star") copy.isStarred = value;
        if (action === "archive") copy.isArchived = value;
        return copy;
      });

      if (!updated) return res.status(404).json({ error: "Email not found" });

      await logEmailActivity(session.userId, id, `${action}_${value ? "on" : "off"}`, { demo: true });
      return res.json({ success: true, email: updated });
    }

    const addLabels: string[] = [];
    const removeLabels: string[] = [];

    if (action === "read") {
      if (value) removeLabels.push("UNREAD");
      else addLabels.push("UNREAD");
    } else if (action === "star") {
      if (value) addLabels.push("STARRED");
      else removeLabels.push("STARRED");
    } else if (action === "archive") {
      removeLabels.push("INBOX");
    }

    const updated = await modifyGmailLabels(session.accessToken, id, addLabels, removeLabels);
    await logEmailActivity(session.userId, id, `${action}_${value}`, { subject: updated.subject });

    res.json({ success: true, email: updated });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to update labels" });
  }
});

// Move to Trash
app.post("/api/emails/:id/trash", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session as SessionData;
    const { id } = req.params;

    if (session.isDemo || !session.accessToken) {
      updateDemoEmail(id, (e) => ({ ...e, isTrash: true }));
      await logEmailActivity(session.userId, id, "trash_email", { demo: true });
      return res.json({ success: true });
    }

    await trashGmailMessage(session.accessToken, id);
    await logEmailActivity(session.userId, id, "trash_email", {});
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to trash email" });
  }
});

// Untrash
app.post("/api/emails/:id/untrash", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session as SessionData;
    const { id } = req.params;

    if (session.isDemo || !session.accessToken) {
      updateDemoEmail(id, (e) => ({ ...e, isTrash: false }));
      await logEmailActivity(session.userId, id, "untrash_email", { demo: true });
      return res.json({ success: true });
    }

    await untrashGmailMessage(session.accessToken, id);
    await logEmailActivity(session.userId, id, "untrash_email", {});
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to restore email" });
  }
});

// Delete Permanently
app.delete("/api/emails/:id", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session as SessionData;
    const { id } = req.params;

    if (session.isDemo || !session.accessToken) {
      deleteDemoEmailPermanently(id);
      await logEmailActivity(session.userId, id, "delete_permanent", { demo: true });
      return res.json({ success: true });
    }

    await deleteGmailMessage(session.accessToken, id);
    await logEmailActivity(session.userId, id, "delete_permanent", {});
    res.json({ success: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to delete email" });
  }
});

// Send Email
app.post("/api/emails/send", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session as SessionData;
    const { to, cc, bcc, subject, body, threadId, inReplyTo } = req.body;

    if (!to || !subject || !body) {
      return res.status(400).json({ error: "Recipient (To), Subject, and Body are required." });
    }

    if (session.isDemo || !session.accessToken) {
      const newEmail = addDemoEmail({
        threadId: threadId || `th-${Date.now()}`,
        labelIds: ["SENT"],
        snippet: body.slice(0, 140),
        from: { name: session.user.name, email: session.user.email },
        to: [{ name: to, email: to }],
        subject,
        date: new Date().toISOString(),
        bodyText: body,
        bodyHtml: `<p>${body.replace(/\n/g, "<br/>")}</p>`,
        isRead: true,
        isStarred: false,
        isArchived: false,
      });

      await logEmailActivity(session.userId, newEmail.id, "send_email", {
        to,
        subject,
        isReply: !!inReplyTo,
        demo: true,
      });

      return res.json({
        success: true,
        message: "Email sent successfully (Sandbox)",
        email: newEmail,
      });
    }

    const result = await sendGmailEmail(session.accessToken, {
      to,
      cc,
      bcc,
      subject,
      body,
      threadId,
      inReplyTo,
    });

    await logEmailActivity(session.userId, result.id, "send_email", {
      to,
      subject,
      threadId: result.threadId,
    });

    res.json({
      success: true,
      message: "Email sent successfully via Gmail API",
      result,
    });
  } catch (err: any) {
    console.error("Send email error:", err);
    res.status(500).json({ error: err.message || "Failed to send email" });
  }
});

/**
 * ----------------------------------------------------
 * AI ENDPOINTS (GEMINI API)
 * ----------------------------------------------------
 */

// Summarize Email
app.post("/api/ai/summarize", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session as SessionData;
    const { subject, sender, body, threadHistory, emailId } = req.body;

    if (!body) {
      return res.status(400).json({ error: "Email body is required for summarization." });
    }

    const result = await summarizeEmail({
      subject: subject || "No Subject",
      sender: sender || "Unknown",
      body,
      threadHistory,
    });

    if (emailId) {
      await logEmailActivity(session.userId, emailId, "ai_summarize", {
        priority: result.priority,
        sentiment: result.sentiment,
      });
    }

    res.json({ success: true, result });
  } catch (err: any) {
    console.error("Gemini summarize error:", err);
    res.status(500).json({ error: err.message || "Failed to generate AI summary" });
  }
});

// Generate AI Reply
app.post("/api/ai/reply", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session as SessionData;
    const { subject, sender, body, tone, userInstructions, userDraft, keyPointsToInclude, emailId } = req.body;

    if (!body) {
      return res.status(400).json({ error: "Email body is required to generate a reply." });
    }

    const result = await generateReply({
      subject: subject || "Reply",
      sender: sender || "Sender",
      body,
      tone,
      userInstructions,
      userDraft,
      keyPointsToInclude,
    });

    if (emailId) {
      await logEmailActivity(session.userId, emailId, "ai_generate_reply", { tone });
    }

    res.json({ success: true, result });
  } catch (err: any) {
    console.error("Gemini reply error:", err);
    res.status(500).json({ error: err.message || "Failed to generate AI reply" });
  }
});

// Explain Email in Plain English (ELI5)
app.post("/api/ai/explain", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session as SessionData;
    const { subject, sender, body, emailId } = req.body;

    if (!body) {
      return res.status(400).json({ error: "Email body is required." });
    }

    const result = await explainEmail(subject || "No Subject", sender || "Sender", body);

    if (emailId) {
      await logEmailActivity(session.userId, emailId, "ai_explain", {});
    }

    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to explain email" });
  }
});

// Enhance / Rewrite Text
app.post("/api/ai/enhance", requireAuth, async (req: Request, res: Response) => {
  try {
    const { text, mode } = req.body;
    if (!text) {
      return res.status(400).json({ error: "Text is required." });
    }

    const result = await enhanceEmailText({ text, mode: mode || "professional" });
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to enhance text" });
  }
});

// Generate Subject Lines
app.post("/api/ai/generate-subject", requireAuth, async (req: Request, res: Response) => {
  try {
    const { body, currentSubject } = req.body;
    if (!body) {
      return res.status(400).json({ error: "Body content is required to generate subjects." });
    }

    const result = await generateSubjectLines(body, currentSubject);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to generate subjects" });
  }
});

// Smart Search Query
app.post("/api/ai/smart-search", requireAuth, async (req: Request, res: Response) => {
  try {
    const { query } = req.body;
    if (!query) {
      return res.status(400).json({ error: "Query is required." });
    }

    const result = await smartSearchQuery(query);
    res.json({ success: true, result });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Smart search processing failed" });
  }
});

/**
 * ----------------------------------------------------
 * ACTIVITY & SYSTEM STATUS
 * ----------------------------------------------------
 */

// Get User Email Activities
app.get("/api/activities", requireAuth, async (req: Request, res: Response) => {
  try {
    const session = (req as any).session as SessionData;
    const limit = parseInt((req.query.limit as string) || "50", 10);
    const activities = await getEmailActivities(session.userId, limit);
    res.json({ activities });
  } catch (err: any) {
    res.status(500).json({ error: err.message || "Failed to fetch activities" });
  }
});

// System Health & Configuration Status
app.get("/api/system/status", (req: Request, res: Response) => {
  const hasGemini = !!process.env.GEMINI_API_KEY;
  const hasGoogleOAuth = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  const supabaseInstance = getSupabase();
  const hasSupabase = !!supabaseInstance;

  res.json({
    gemini: {
      status: hasGemini ? "connected" : "missing_key",
      model: "gemini-3.7-flash",
    },
    googleOAuth: {
      status: hasGoogleOAuth ? "configured" : "credentials_needed",
      clientIdConfigured: !!process.env.GOOGLE_CLIENT_ID,
    },
    supabase: {
      status: hasSupabase ? "connected" : "local_fallback",
      hasUrl: !!process.env.SUPABASE_URL,
    },
    version: "1.0.0",
  });
});

// SQL Schema for Supabase Setup
app.get("/api/system/schema-sql", (req: Request, res: Response) => {
  res.setHeader("Content-Type", "text/plain");
  res.send(SUPABASE_SCHEMA_SQL);
});

/**
 * ----------------------------------------------------
 * VITE MIDDLEWARE & SERVER STARTUP
 * ----------------------------------------------------
 */

async function start() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Intelligent Email Assistant server running at http://0.0.0.0:${PORT}`);
  });
}

start();
