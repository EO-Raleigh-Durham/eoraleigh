"use client";

import Link from "next/link";
import { useState, useTransition, Suspense } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { getLoginRedirect } from "./actions";
import { useSearchParams } from "next/navigation";
import { PasswordInput } from "@/components/PasswordInput";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

function LoginTabs() {
  const searchParams = useSearchParams();
  const initialTab = searchParams.get("tab") === "signup" ? "signup" : "signin";
  const [activeTab, setActiveTab] = useState<"signin" | "signup">(initialTab);

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">{CHAPTER_NAME}</div>

        <div className="auth-tabs">
          <button
            type="button"
            className={`auth-tab ${activeTab === "signin" ? "auth-tab--active" : ""}`}
            onClick={() => setActiveTab("signin")}
          >
            Sign in
          </button>
          <button
            type="button"
            className={`auth-tab ${activeTab === "signup" ? "auth-tab--active" : ""}`}
            onClick={() => setActiveTab("signup")}
          >
            Sign up
          </button>
        </div>

        {activeTab === "signin" ? <SignInForm /> : <SignUpForm />}
      </div>
    </div>
  );
}

function SignInForm() {
  const searchParams = useSearchParams();
  const callbackError = searchParams.get("error");
  // Where the visitor was headed when the proxy bounced them here (e.g. a
  // /member/requalify link). Validated server-side by getLoginRedirect: same-
  // site paths only, and only if the signed-in role can actually open it.
  const rawNext = searchParams.get("next");

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(
    callbackError ? "Authentication failed. Please try again." : null,
  );
  const [isPending, startTransition] = useTransition();

  const supabase = createBrowserSupabase();

  function handleSignIn(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error: signInErr } = await supabase.auth.signInWithPassword({
        email,
        password,
      });
      if (signInErr) {
        setError("Incorrect email or password.");
        return;
      }
      const dest = await getLoginRedirect(rawNext);
      // Full-page navigation, not router.push + refresh: a hard load lets the
      // server re-render with the freshly written session cookie and the proxy
      // see it. router.push/refresh inside a transition can leave isPending
      // stuck true ("Signing in..." forever), so we navigate outright.
      window.location.assign(dest);
    });
  }

  return (
    <>
      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSignIn} className="auth-form">
        <label className="auth-field">
          <span className="auth-label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            autoComplete="email"
            className="auth-input"
          />
        </label>
        <label className="auth-field">
          <span className="auth-label">Password</span>
          <PasswordInput
            value={password}
            onChange={setPassword}
            autoComplete="current-password"
            required
          />
        </label>
        <div className="auth-forgot">
          <Link href="/forgot-password" className="auth-link">Forgot password?</Link>
        </div>
        <button type="submit" className="auth-btn" disabled={isPending}>
          {isPending ? "Signing in..." : "Sign in"}
        </button>
      </form>
    </>
  );
}

function SignUpForm() {
  const searchParams = useSearchParams();
  const rawNext = searchParams.get("next");
  const [email, setEmail] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);
  const [isPending, startTransition] = useTransition();

  const supabase = createBrowserSupabase();

  function handleSignUp(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    startTransition(async () => {
      const next = rawNext?.startsWith("/") ? rawNext : "/";
      const callback = new URL("/api/auth/callback", window.location.origin);
      callback.searchParams.set("next", next);
      const { error: signUpErr } = await supabase.auth.signInWithOtp({
        email,
        options: {
          emailRedirectTo: callback.toString(),
          shouldCreateUser: true,
        },
      });

      if (signUpErr) {
        setError("We could not send the sign-in link. Please try again.");
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="auth-hint">
        Check your inbox. The secure link will sign you in and open the right {CHAPTER_NAME} access level.
      </div>
    );
  }

  return (
    <>
      {error && <div className="auth-error">{error}</div>}

      <form onSubmit={handleSignUp} className="auth-form">
        <label className="auth-field">
          <span className="auth-label">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            placeholder="you@example.com"
            autoComplete="email"
            className="auth-input"
          />
        </label>
        <button type="submit" className="auth-btn" disabled={isPending}>
          {isPending ? "Sending link..." : "Email me a secure link"}
        </button>
      </form>

      <p className="auth-hint">
        Verified {CHAPTER_NAME} member emails receive member access automatically. Other accounts can register for events and access their own tickets.
      </p>
    </>
  );
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginTabs />
    </Suspense>
  );
}
