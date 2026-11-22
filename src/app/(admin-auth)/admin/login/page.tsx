"use client";

import Link from "next/link";
import { useState, useTransition } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { safeNextPath } from "@/lib/safe-next";
import { getLoginRedirect } from "@/app/login/actions";
import { useSearchParams } from "next/navigation";
import { Suspense } from "react";
import { PasswordInput } from "@/components/PasswordInput";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

function AdminLoginForm() {
  const searchParams = useSearchParams();
  const isReset = searchParams.get("reset") === "1";
  const callbackError = searchParams.get("error");
  // Where the visitor was headed when the proxy bounced them here. Validated
  // server-side by getLoginRedirect (same-site + role tier); the sanitized
  // copy below only threads it through the reset-password detour links.
  const rawNext = searchParams.get("next");
  const nextPath = safeNextPath(rawNext);
  const nextSuffix = nextPath ? `&next=${encodeURIComponent(nextPath)}` : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [error, setError] = useState<string | null>(
    callbackError ? "Authentication failed. Please try again." : null,
  );
  const [resetSent, setResetSent] = useState(false);
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
      // Land where the visitor was headed if their role can open it, else the
      // chapter dashboard (board-accessible) so board members are not bounced
      // by the super_admin gate on the /admin index.
      const dest = await getLoginRedirect(rawNext);
      // Hard-navigate so the server and proxy see the freshly written session
      // cookie. Client navigation inside this transition can leave isPending
      // stuck true even after authentication succeeds.
      window.location.assign(dest);
    });
  }

  function handlePasswordReset(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: `${window.location.origin}/api/auth/callback?next=${encodeURIComponent(
          nextPath ?? "/board/chapter-dashboard",
        )}`,
      });
      if (resetErr) {
        setError(resetErr.message);
        return;
      }
      setResetSent(true);
    });
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">{CHAPTER_NAME}</div>
        <h1 className="auth-title">{isReset ? "Reset your password" : "Admin sign in"}</h1>

        {error && <div className="auth-error">{error}</div>}

        {isReset ? (
          resetSent ? (
            <p className="auth-hint">
              Check your email for a password reset link. You can close this tab.
            </p>
          ) : (
            <form onSubmit={handlePasswordReset} className="auth-form">
              <label className="auth-field">
                <span className="auth-label">Email</span>
                <input
                  type="email"
                  value={resetEmail}
                  onChange={(e) => setResetEmail(e.target.value)}
                  required
                  placeholder="you@example.com"
                  autoComplete="email"
                  className="auth-input"
                />
              </label>
              <button type="submit" className="auth-btn" disabled={isPending}>
                {isPending ? "Sending..." : "Send reset link"}
              </button>
              <Link
                href={`/admin/login${nextPath ? `?next=${encodeURIComponent(nextPath)}` : ""}`}
                className="auth-link"
              >
                Back to sign in
              </Link>
            </form>
          )
        ) : (
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
            <button type="submit" className="auth-btn" disabled={isPending}>
              {isPending ? "Signing in..." : "Sign in"}
            </button>
            <Link href={`/admin/login?reset=1${nextSuffix}`} className="auth-link">Forgot password?</Link>
          </form>
        )}
      </div>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <AdminLoginForm />
    </Suspense>
  );
}
