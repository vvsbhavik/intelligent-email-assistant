import React, { useState, useEffect } from "react";
import {
  X,
  Database,
  Sparkles,
  ShieldCheck,
  Server,
  Cloud,
  Copy,
  Check,
  ExternalLink,
  Code2,
  Terminal,
  Layers,
  Cpu,
  Lock,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { api } from "../../services/api";

export const SystemStatusModal: React.FC<{ isOpen: boolean; onClose: () => void }> = ({
  isOpen,
  onClose,
}) => {
  const { systemStatus, isDemo, isRealGoogleConnected } = useAuth();
  const [sqlSchema, setSqlSchema] = useState("");
  const [copiedSql, setCopiedSql] = useState(false);
  const [activeTab, setActiveTab] = useState<"architecture" | "schema" | "deployment">("architecture");

  useEffect(() => {
    if (isOpen) {
      api.getSupabaseSchemaSql().then(setSqlSchema).catch(() => {});
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const copySql = () => {
    navigator.clipboard.writeText(sqlSchema);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-fade-in">
      <div className="bg-slate-900 border border-slate-750 rounded-3xl w-full max-w-3xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="h-16 px-6 bg-slate-850 border-b border-slate-750 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 text-white shadow-sm">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h2 className="font-bold text-sm md:text-base text-slate-100">
                System Architecture & Deployment Guide
              </h2>
              <p className="text-xs text-slate-400">
                Production stack: React • Express • Supabase • Gmail API • Gemini 3.7
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={onClose}
            className="p-2 text-slate-400 hover:text-slate-200 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Tab Buttons */}
        <div className="flex items-center px-6 border-b border-slate-800 bg-slate-850/60 gap-4 text-xs font-semibold">
          <button
            type="button"
            onClick={() => setActiveTab("architecture")}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === "architecture"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Stack & Live Status
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("schema")}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === "schema"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Supabase SQL Schema
          </button>
          <button
            type="button"
            onClick={() => setActiveTab("deployment")}
            className={`py-3 border-b-2 transition-colors ${
              activeTab === "deployment"
                ? "border-sky-500 text-sky-400"
                : "border-transparent text-slate-400 hover:text-slate-200"
            }`}
          >
            Deployment Setup (Vercel & Render)
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs text-slate-300">
          {/* TAB 1: ARCHITECTURE & STATUS */}
          {activeTab === "architecture" && (
            <div className="space-y-5">
              {/* Live Service Cards Grid */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {/* Gemini AI */}
                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-100 text-xs">
                      <Sparkles className="w-4 h-4 text-sky-400" />
                      <span>Google Gemini AI</span>
                    </div>
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                      Connected
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Model: <strong>gemini-3.7-flash</strong> via official <code>@google/genai</code> SDK.
                    Powers summaries, replies, and categorization.
                  </p>
                </div>

                {/* Google OAuth & Gmail */}
                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-100 text-xs">
                      <ShieldCheck className="w-4 h-4 text-indigo-400" />
                      <span>Google / Gmail API</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        isRealGoogleConnected
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                      }`}
                    >
                      {isRealGoogleConnected ? "Live Connected" : "Sandbox Ready"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    RFC 2822 email dispatches, label modifications, and OAuth 2.0 PKCE token management on backend.
                  </p>
                </div>

                {/* Supabase DB */}
                <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 font-bold text-slate-100 text-xs">
                      <Database className="w-4 h-4 text-emerald-400" />
                      <span>Supabase PostgreSQL</span>
                    </div>
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                        systemStatus?.supabase?.status === "connected"
                          ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                          : "bg-sky-500/10 text-sky-400 border border-sky-500/20"
                      }`}
                    >
                      {systemStatus?.supabase?.status === "connected" ? "Postgres Live" : "Active Fallback"}
                    </span>
                  </div>
                  <p className="text-[11px] text-slate-400 leading-relaxed">
                    Stores <code>users</code> accounts and <code>email_activities</code> audit history records.
                  </p>
                </div>
              </div>

              {/* Security Blueprint */}
              <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 space-y-2">
                <h3 className="font-bold text-slate-100 text-xs flex items-center gap-2">
                  <Lock className="w-4 h-4 text-emerald-400" />
                  <span>Security & Zero-Knowledge Architecture</span>
                </h3>
                <ul className="space-y-1.5 text-xs text-slate-300">
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>No password storage:</strong> Authentication uses Google OAuth 2.0 directly.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Server-Side Secret Isolation:</strong> Gemini API keys, OAuth client secrets, and Supabase service keys are never sent to the browser.</span>
                  </li>
                  <li className="flex items-start gap-2">
                    <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                    <span><strong>Source of Truth:</strong> Actual email messages remain inside Gmail; only audit events and user identity are retained in Supabase.</span>
                  </li>
                </ul>
              </div>
            </div>
          )}

          {/* TAB 2: SUPABASE SQL SCHEMA */}
          {activeTab === "schema" && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-bold text-slate-100 text-xs">PostgreSQL Schema Definition</h3>
                  <p className="text-[11px] text-slate-400">
                    Paste this into Supabase SQL Editor to provision the <code>users</code> and <code>email_activities</code> tables.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={copySql}
                  className="px-3 py-1.5 bg-sky-500/10 hover:bg-sky-500/20 text-sky-300 border border-sky-500/20 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
                >
                  {copiedSql ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copiedSql ? "Copied SQL" : "Copy SQL Script"}</span>
                </button>
              </div>

              <pre className="p-4 bg-slate-950 rounded-2xl border border-slate-800 text-[11px] font-mono text-slate-300 overflow-x-auto leading-relaxed max-h-80">
                {sqlSchema}
              </pre>
            </div>
          )}

          {/* TAB 3: DEPLOYMENT GUIDE */}
          {activeTab === "deployment" && (
            <div className="space-y-4">
              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-750 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-100 text-xs">
                  <Cloud className="w-4 h-4 text-sky-400" />
                  <span>1. Deploy Frontend to Vercel</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Connect your GitHub repo to Vercel. Set the build command to <code>npm run build</code> and output directory to <code>dist</code>.
                </p>
              </div>

              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-750 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-100 text-xs">
                  <Server className="w-4 h-4 text-indigo-400" />
                  <span>2. Deploy Backend to Render</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  Deploy as a Node.js Web Service on Render. Build command: <code>npm run build</code>, Start command: <code>npm start</code>.
                </p>
              </div>

              <div className="p-4 bg-slate-850 rounded-2xl border border-slate-750 space-y-2">
                <div className="flex items-center gap-2 font-bold text-slate-100 text-xs">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>3. Google Cloud OAuth Configuration</span>
                </div>
                <p className="text-[11px] text-slate-400">
                  In Google Cloud Console &rarr; APIs & Services &rarr; Credentials, add your authorized redirect URI:
                  <code className="block mt-1 p-2 bg-slate-950 rounded border border-slate-800 text-sky-300 font-mono text-[10px]">
                    https://your-backend-service.onrender.com/api/auth/google/callback
                  </code>
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="h-14 px-6 bg-slate-850 border-t border-slate-750 flex items-center justify-between shrink-0">
          <span className="text-[11px] text-slate-400 font-mono">
            App Engine: Intelligent Email Assistant v1.0.0
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-200 font-semibold rounded-xl text-xs transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
