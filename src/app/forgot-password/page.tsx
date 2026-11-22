"use client";

import Link from "next/link";
import { useState, useTransition, Suspense } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { useSearchParams } from "next/navigation";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

function ForgotPasswordForm() {
  const searchParams = useSearchParams();
  const expired = searchParams.get("expired") === "1";

  const [email, setEmail] = useState("");
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(
    expired ? "That reset link has expired. Enter your email to get a new one." : null,
  );
  const [isPending, startTransition] = useTransition();

  const supabase = createBrowserSupabase();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    startTransition(async () => {
      const redirectTo = `${window.location.origin}/api/auth/callback?next=/reset-password`;
      const { error: resetErr } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo,
      });
      if (resetErr) {
        setError(resetErr.message);
        return;
      }
      setSent(true);
    });
  }

  if (sent) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">{CHAPTER_NAME}</div>
          <h1 className="auth-title">Check your email</h1>
          <div className="auth-success">
            We sent a reset link to <strong>{email}</strong>. Click the link in that email to set a new password.
          </div>
          <p className="auth-hint">
            <Link href="/login" className="auth-link">Back to sign in</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">{CHAPTER_NAME}</div>
        <h1 className="auth-title">Reset password</h1>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
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
            {isPending ? "Sending..." : "Send reset link"}
          </button>
        </form>
        <p className="auth-hint">
          <Link href="/login" className="auth-link">Back to sign in</Link>
        </p>
      </div>
    </div>
  );
}

export default function ForgotPasswordPage() {
  return (
    <Suspense>
      <ForgotPasswordForm />
    </Suspense>
  );
}
