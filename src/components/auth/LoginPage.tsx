import React, { useState } from "react";
import {
  Mail,
  Sparkles,
  ShieldCheck,
  Zap,
  ArrowRight,
  Database,
  Bot,
  Layers,
  Lock,
  CheckCircle2,
  Inbox,
  Send,
  RefreshCw,
} from "lucide-react";
import { useAuth } from "../../context/AuthContext";

export const LoginPage: React.FC<{ onOpenStatusModal: () => void }> = ({ onOpenStatusModal }) => {
  const { loginWithGoogle, loginWithDemo, systemStatus } = useAuth();
  const [isLoggingInGoogle, setIsLoggingInGoogle] = useState(false);
  const [isLoggingInDemo, setIsLoggingInDemo] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(() => {
    if (typeof window !== "undefined") {
      const params = new URLSearchParams(window.location.search);
      return params.get("error");
    }
    return null;
  });

  const handleGoogleLogin = async () => {
    setIsLoggingInGoogle(true);
    setErrorMessage(null);
    try {
      await loginWithGoogle();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to start Google sign-in.");
      setIsLoggingInGoogle(false);
    }
  };

  const handleDemoLogin = async () => {
    setIsLoggingInDemo(true);
    setErrorMessage(null);
    try {
      await loginWithDemo();
    } catch (err: any) {
      setErrorMessage(err.message || "Failed to launch Sandbox Demo.");
      setIsLoggingInDemo(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col justify-between selection:bg-sky-500 selection:text-white">
      {/* Top Navbar */}
      <header className="h-16 border-b border-slate-800/80 px-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-sky-500 to-indigo-600 flex items-center justify-center shadow-lg shadow-sky-500/20 text-white">
            <Mail className="w-5 h-5" />
          </div>
          <div>
            <span className="font-bold text-sm tracking-tight text-slate-100">
              Intelligent Email Assistant
            </span>
          </div>
        </div>

        <button
          type="button"
          onClick={onOpenStatusModal}
          className="px-3 py-1.5 bg-slate-900 hover:bg-slate-850 border border-slate-800 rounded-xl text-xs font-semibold text-slate-300 hover:text-white transition-colors flex items-center gap-1.5"
        >
          <Database className="w-3.5 h-3.5 text-indigo-400" />
          <span>Architecture & Stack</span>
        </button>
      </header>

      {/* Main Hero & Auth Card */}
      <main className="max-w-6xl mx-auto px-4 py-12 flex-1 flex flex-col items-center justify-center">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center w-full">
          {/* Left Column: Value Proposition */}
          <div className="lg:col-span-7 space-y-6 text-center lg:text-left">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-400 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Powered by Google Gemini 3.7 & Supabase</span>
            </div>

            <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold tracking-tight text-slate-100 leading-tight">
              Your Inbox, Supercharged with{" "}
              <span className="bg-gradient-to-r from-sky-400 via-indigo-400 to-sky-300 bg-clip-text text-transparent">
                Adaptive AI
              </span>
            </h1>

            <p className="text-sm sm:text-base text-slate-400 max-w-xl mx-auto lg:mx-0 leading-relaxed">
              Read, summarize, triage, and draft high-impact replies with deep neural comprehension. Built on official Gmail API RFC 2822 specifications and persistent Supabase PostgreSQL audit logs.
            </p>

            {/* Feature Highlights Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400 shrink-0">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Neural Summarization</h4>
                  <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    Instant executive briefs, priority scoring, and required action items.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 shrink-0">
                  <Bot className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Contextual Smart Replies</h4>
                  <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    Generate multi-tone responses tailored to specific conversational context.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                  <Database className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Supabase Audit Trail</h4>
                  <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    Track all actions, timestamps, and message states in PostgreSQL.
                  </p>
                </div>
              </div>

              <div className="p-3.5 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-start gap-3">
                <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                  <Lock className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">Zero-Secret Browser</h4>
                  <p className="text-[11px] text-slate-400 leading-snug mt-0.5">
                    OAuth credentials and AI keys strictly isolated on the backend server.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Sign In Card */}
          <div className="lg:col-span-5 w-full max-w-md mx-auto">
            <div className="p-6 md:p-8 rounded-3xl bg-slate-900 border border-slate-800 shadow-2xl space-y-6">
              <div className="text-center space-y-1">
                <h3 className="text-lg font-bold text-slate-100">Welcome</h3>
                <p className="text-xs text-slate-400">
                  Connect your Google account or explore via instant sandbox.
                </p>
              </div>

              {errorMessage && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-rose-300 text-xs">
                  {errorMessage}
                </div>
              )}

              {/* Action 1: Google OAuth Button */}
              <button
                type="button"
                id="login-google-btn"
                onClick={handleGoogleLogin}
                disabled={isLoggingInGoogle || isLoggingInDemo}
                className="w-full py-3 px-4 rounded-2xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs md:text-sm shadow flex items-center justify-center gap-3 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoggingInGoogle ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-slate-900" />
                ) : (
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#4285F4"
                      d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                    />
                    <path
                      fill="#EA4335"
                      d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                    />
                  </svg>
                )}
                <span>Continue with Google Account</span>
              </button>

              <div className="relative flex items-center justify-center">
                <div className="border-t border-slate-800 w-full" />
                <span className="bg-slate-900 px-3 text-[11px] font-medium text-slate-400 uppercase tracking-wider shrink-0">
                  Or Instant Preview
                </span>
              </div>

              {/* Action 2: Demo Sandbox Button */}
              <button
                type="button"
                id="login-demo-btn"
                onClick={handleDemoLogin}
                disabled={isLoggingInGoogle || isLoggingInDemo}
                className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-sky-500 to-indigo-600 hover:from-sky-400 hover:to-indigo-500 text-white font-semibold text-xs md:text-sm shadow-lg shadow-sky-500/20 flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50"
              >
                {isLoggingInDemo ? (
                  <RefreshCw className="w-4 h-4 animate-spin text-white" />
                ) : (
                  <Zap className="w-4 h-4 text-amber-300" />
                )}
                <span>Launch Interactive Sandbox</span>
                <ArrowRight className="w-4 h-4 ml-1" />
              </button>

              <p className="text-[11px] text-slate-400 text-center leading-relaxed">
                Sandbox mode includes simulated emails, live Gemini 3.7 AI analysis, draft generation, and Supabase audit logs without needing Google credentials.
              </p>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="h-14 border-t border-slate-800/80 px-6 flex items-center justify-between text-xs text-slate-400">
        <span>Intelligent Email Assistant • Full-Stack Web Application</span>
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-400" />
            Gemini 3.7 Flash
          </span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-sky-400" />
            Supabase DB
          </span>
        </div>
      </footer>
    </div>
  );
};
