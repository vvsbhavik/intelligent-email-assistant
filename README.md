# Intelligent Email Assistant

> An AI-powered email management platform using Gmail API, Google Gemini AI, and Supabase — built as a full-stack workshop project.

---

## Problem Statement

Modern email inboxes are overwhelming. Professionals spend hours reading long threads, identifying action items, and drafting responses. This project tackles that problem head-on by layering Gemini AI directly onto your Gmail inbox — summarizing threads, detecting urgency, generating contextual replies, and helping you write better emails faster.

---

## Features

| Feature | Description |
|---|---|
| Google OAuth 2.0 | Secure sign-in with your Google account |
| Gmail Inbox | Real inbox, threads, search, starring, archiving, trash |
| Send Email | Compose and send real emails via Gmail API |
| AI Email Summarization | Executive summary, key points, action items, priority & sentiment |
| AI Smart Reply | Multi-tone reply generation (Professional, Friendly, Concise, Urgent) |
| AI ELI5 Explainer | Plain-English breakdown of complex emails |
| AI Email Polisher | Rewrite drafts with grammar correction, tone adjustment, elaboration |
| Natural Language Search | Converts plain-English queries into Gmail search parameters |
| Supabase Audit Trail | All email interactions and AI actions logged to PostgreSQL |
| 1-Click Demo Mode | Explore all features instantly without connecting a Google account |

---

## Technology Stack

**Frontend**
- React 19
- Vite (build tool)
- Tailwind CSS
- TypeScript
- Lucide React (icons)

**Backend**
- Node.js
- Express
- TypeScript
- tsx (dev runtime)

**APIs & Services**
- Gmail REST API — inbox, search, send, archive, trash
- Google Gemini AI (`@google/genai`) — summarize, reply, explain, rewrite
- Google OAuth 2.0 — secure, token-based authentication
- Supabase PostgreSQL — user records, sessions, activity log

---

## Architecture

This is an **integrated monorepo** — the Express backend serves the Vite frontend as a single application. They are deployed **separately** in production (Vercel + Render), but share a single codebase.

```
intelligent-email-assistant/
├── server.ts              ← Express backend (all API routes + Vite middleware)
├── server/
│   ├── gemini.ts          ← Gemini AI integration
│   ├── gmail.ts           ← Gmail API + Google OAuth
│   └── supabase.ts        ← Supabase client, schema, DB operations
├── src/                   ← React frontend (Vite)
│   ├── components/
│   │   ├── auth/          ← LoginPage
│   │   ├── email/         ← EmailList, EmailView, ComposeModal
│   │   ├── ai/            ← AIAssistantPanel
│   │   ├── activity/      ← ActivityLog
│   │   └── layout/        ← Navbar, Sidebar
│   ├── context/           ← AuthContext
│   ├── services/          ← API client (api.ts)
│   └── types/             ← TypeScript types
├── .env.example           ← Environment variable template
├── package.json
└── README.md
```

---

## Screenshots

> **Screenshots to add:**
> 1. Login page with "Continue with Google Account" button
> 2. Main dashboard / inbox view
> 3. Email detail view with AI Assistant panel open (summary tab)
> 4. Smart Reply generation with tone selector
> 5. ELI5 explainer output
> 6. Compose modal

---

## Live Demo

**Frontend**: `https://intelligent-email-assistant-two.vercel.app`


## Backend

**API**: `https://intelligent-email-assistant-api.onrender.com`

- Gmail API calls (inbox, threads, send, search, archive, trash, drafts)
- Gemini AI invocations (summarize, reply, explain, rewrite)
- Supabase user upserts and activity logging

**All secrets (Google OAuth, Gemini API key, Supabase service role key) remain server-side and are never sent to the browser.**


## Supabase Database Setup

Run the following SQL in your Supabase SQL Editor (`https://app.supabase.com` → Project → SQL Editor):

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Users table
CREATE TABLE IF NOT EXISTS public.users (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  google_id   TEXT UNIQUE NOT NULL,
  email       TEXT UNIQUE NOT NULL,
  name        TEXT,
  picture     TEXT,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Email activity audit trail
CREATE TABLE IF NOT EXISTS public.email_activities (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     UUID REFERENCES public.users(id) ON DELETE CASCADE NOT NULL,
  email_id    TEXT NOT NULL,
  action      TEXT NOT NULL,
  metadata    JSONB DEFAULT '{}'::jsonb,
  created_at  TIMESTAMPTZ DEFAULT NOW() NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_email_activities_user_created
  ON public.email_activities (user_id, created_at DESC);

-- Enable Row Level Security
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_activities ENABLE ROW LEVEL SECURITY;

-- Service role bypass policies
CREATE POLICY "service_role_users" ON public.users
  FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_activities" ON public.email_activities
  FOR ALL USING (true) WITH CHECK (true);
```

> **If upgrading an existing database**, also run:
> ```sql
> ALTER TABLE public.users ADD COLUMN IF NOT EXISTS picture TEXT;
> ALTER TABLE public.users ADD COLUMN IF NOT EXISTS name TEXT;
> NOTIFY pgrst, 'reload schema';
> ```

---

## Setup Instructions (Local Development)

### Prerequisites
- Node.js 18+
- A Google Cloud project with OAuth 2.0 credentials
- A Supabase project
- A Google Gemini API key

### Steps

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-username/intelligent-email-assistant.git
   cd intelligent-email-assistant
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Create your `.env` file** (copy from `.env.example`):
   ```bash
   cp .env.example .env
   ```
   Fill in your real credentials (see Environment Variables section below).

4. **Set up Supabase** — run the SQL from the Supabase section above.

5. **Start the development server**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `GOOGLE_CLIENT_ID` | ✅ | Google OAuth 2.0 Client ID |
| `GOOGLE_CLIENT_SECRET` | ✅ | Google OAuth 2.0 Client Secret |
| `GEMINI_API_KEY` | ✅ | Google Gemini AI API key |
| `SUPABASE_URL` | ✅ | Your Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | ✅ | Supabase service role key (backend only) |
| `SUPABASE_ANON_KEY` | Optional | Supabase anon key (fallback) |
| `SESSION_SECRET` | ✅ | Long random string for signing session cookies |
| `FRONTEND_URL` | Production | Your Vercel frontend URL (e.g. `https://your-app.vercel.app`) |
| `BACKEND_URL` | Production | Your Render backend URL (e.g. `https://your-api.onrender.com`) |

> **Never commit your `.env` file.** It is protected by `.gitignore`.

---

## Deployment

### Backend (Render)

1. Push code to GitHub.
2. Create a new **Web Service** on Render connected to your GitHub repo.
3. Set:
   - **Environment**: Node
   - **Build Command**: `npm run build`
   - **Start Command**: `npm start`
4. Add all environment variables from the table above in the Render dashboard.
   - Set `FRONTEND_URL` to your Vercel app URL.
   - Set `BACKEND_URL` to your Render service URL.
5. In **Google Cloud Console → Credentials → OAuth 2.0 Client**:
   - Add `https://your-backend.onrender.com/api/auth/google/callback` to **Authorized redirect URIs**
   - Add `https://your-frontend.vercel.app` to **Authorized JavaScript origins**

### Frontend (Vercel)

1. Create a new project on Vercel connected to the same GitHub repo.
2. Set:
   - **Framework Preset**: Vite
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add environment variable:
   - `NEXT_PUBLIC_API_URL` = `https://your-backend.onrender.com`

---

## Google OAuth Publishing Note
> ⚠️ **Important**: While the code is fully production-ready, Google restricts OAuth app access until the app completes **Google's verification process**.
>
> - During testing: Only explicitly added **Test Users** can sign in.
> - For public access: You must publish the OAuth consent screen and, because this app uses Gmail API scopes, complete a **CASA Tier 2 Security Assessment**.
>
> This is a Google Cloud policy requirement and is independent of the code quality.

---

## Security

- OAuth Client Secret, Gemini API key, and Supabase Service Role key are **never sent to the browser**
- Google access/refresh tokens are stored **server-side only** (in-memory session store)
- Session cookies are `httpOnly`, `signed`, `secure`, and `SameSite=None`
- CORS is restricted to explicit allowed origins (`localhost` + `FRONTEND_URL`)
- `.env` is git-ignored
