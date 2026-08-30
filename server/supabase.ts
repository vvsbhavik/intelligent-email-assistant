import { createClient, SupabaseClient } from "@supabase/supabase-js";

export interface UserRecord {
  id: string;
  google_id: string;
  email: string;
  name: string;
  picture?: string;
  created_at: string;
  updated_at: string;
}

export interface EmailActivityRecord {
  id: string;
  user_id: string;
  email_id: string;
  action: string;
  metadata: Record<string, any>;
  created_at: string;
}

let supabaseClient: SupabaseClient | null = null;

export function getSupabase(): SupabaseClient | null {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY;

  if (!url || !key || url === "https://your-project-id.supabase.co" || key === "your-anon-public-key") {
    return null;
  }

  if (!supabaseClient) {
    supabaseClient = createClient(url, key, {
      auth: { persistSession: false },
    });
  }
  return supabaseClient;
}

// Fallback in-memory / local storage for sandbox preview or when Supabase keys are pending
const localUsers = new Map<string, UserRecord>();
const localActivities: EmailActivityRecord[] = [];

export const SUPABASE_SCHEMA_SQL = `-- Supabase PostgreSQL Schema for Intelligent Email Assistant
-- Run this in your Supabase SQL Editor (https://app.supabase.com -> Project -> SQL Editor)

-- 1. Enable UUID extension
create extension if not exists "uuid-ossp";

-- 2. Create users table
create table if not exists public.users (
  id uuid primary key default uuid_generate_v4(),
  google_id text unique not null,
  email text unique not null,
  name text,
  picture text,
  created_at timestamptz default now() not null,
  updated_at timestamptz default now() not null
);

-- 3. Create email_activities table
create table if not exists public.email_activities (
  id uuid primary key default uuid_generate_v4(),
  user_id uuid references public.users(id) on delete cascade not null,
  email_id text not null,
  action text not null,
  metadata jsonb default '{}'::jsonb,
  created_at timestamptz default now() not null
);

-- 4. Create index for fast activity retrieval by user and timestamp
create index if not exists idx_email_activities_user_created 
  on public.email_activities (user_id, created_at desc);

-- 5. Row Level Security (RLS) policies
alter table public.users enable row level security;
alter table public.email_activities enable row level security;

-- Allow service role full access
create policy "Allow full access to service role" on public.users
  for all using (true) with check (true);

create policy "Allow full access to service role for activities" on public.email_activities
  for all using (true) with check (true);
`;

export async function upsertUser(user: {
  google_id: string;
  email: string;
  name: string;
  picture?: string;
}): Promise<UserRecord> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("users")
        .upsert(
          {
            google_id: user.google_id,
            email: user.email,
            name: user.name,
            picture: user.picture,
            updated_at: now,
          },
          { onConflict: "google_id" }
        )
        .select()
        .single();

      if (error) {
        console.warn("Supabase upsertUser error, falling back to local store:", error.message);
      } else if (data) {
        return data as UserRecord;
      }
    } catch (err: any) {
      console.warn("Supabase query exception:", err.message);
    }
  }

  // Fallback storage
  let existing = Array.from(localUsers.values()).find((u) => u.google_id === user.google_id);
  if (existing) {
    existing.name = user.name;
    existing.email = user.email;
    existing.picture = user.picture;
    existing.updated_at = now;
    return existing;
  }

  const newRecord: UserRecord = {
    id: `usr_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    google_id: user.google_id,
    email: user.email,
    name: user.name,
    picture: user.picture,
    created_at: now,
    updated_at: now,
  };
  localUsers.set(newRecord.id, newRecord);
  return newRecord;
}

export async function getUserById(id: string): Promise<UserRecord | null> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase.from("users").select("*").eq("id", id).maybeSingle();
      if (!error && data) return data as UserRecord;
    } catch (err) {
      // Fall through to local
    }
  }
  return localUsers.get(id) || null;
}

export async function logEmailActivity(
  userId: string,
  emailId: string,
  action: string,
  metadata: Record<string, any> = {}
): Promise<EmailActivityRecord> {
  const supabase = getSupabase();
  const now = new Date().toISOString();

  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("email_activities")
        .insert({
          user_id: userId,
          email_id: emailId,
          action,
          metadata,
          created_at: now,
        })
        .select()
        .single();

      if (!error && data) {
        return data as EmailActivityRecord;
      }
    } catch (err: any) {
      console.warn("Supabase activity insert failed:", err.message);
    }
  }

  const record: EmailActivityRecord = {
    id: `act_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
    user_id: userId,
    email_id: emailId,
    action,
    metadata,
    created_at: now,
  };
  localActivities.unshift(record);
  if (localActivities.length > 500) {
    localActivities.pop();
  }
  return record;
}

export async function getEmailActivities(userId: string, limit = 50): Promise<EmailActivityRecord[]> {
  const supabase = getSupabase();
  if (supabase) {
    try {
      const { data, error } = await supabase
        .from("email_activities")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false })
        .limit(limit);

      if (!error && data) {
        return data as EmailActivityRecord[];
      }
    } catch (err: any) {
      console.warn("Supabase activity fetch failed:", err.message);
    }
  }

  return localActivities.filter((a) => a.user_id === userId).slice(0, limit);
}
