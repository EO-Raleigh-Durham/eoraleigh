"use client";

import Link from "next/link";
import { useState, useTransition, useEffect } from "react";
import { createBrowserSupabase } from "@/lib/supabase-browser";
import { useRouter } from "next/navigation";
import { PasswordInput } from "@/components/PasswordInput";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export default function ResetPasswordPage() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [sessionReady, setSessionReady] = useState<boolean | null>(null);

  const supabase = createBrowserSupabase();

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSessionReady(!!session);
    });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return;
    }

    startTransition(async () => {
      const { error: updateErr } = await supabase.auth.updateUser({ password });
      if (updateErr) {
        setError(updateErr.message);
        return;
      }
      router.push("/member");
      router.refresh();
    });
  }

  if (sessionReady === null) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">{CHAPTER_NAME}</div>
          <p className="auth-hint">Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  if (!sessionReady) {
    return (
      <div className="auth-page">
        <div className="auth-card">
          <div className="auth-brand">{CHAPTER_NAME}</div>
          <h1 className="auth-title">Link expired</h1>
          <p className="auth-hint">
            This reset link has expired or already been used.
          </p>
          <p className="auth-hint">
            <Link href="/forgot-password" className="auth-link">Request a new link</Link>
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">{CHAPTER_NAME}</div>
        <h1 className="auth-title">Set new password</h1>
        {error && <div className="auth-error">{error}</div>}
        <form onSubmit={handleSubmit} className="auth-form">
          <label className="auth-field">
            <span className="auth-label">New password</span>
            <PasswordInput
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              required
            />
          </label>
          <label className="auth-field">
            <span className="auth-label">Confirm password</span>
            <PasswordInput
              value={confirmPassword}
              onChange={setConfirmPassword}
              autoComplete="new-password"
              required
            />
          </label>
          <button type="submit" className="auth-btn" disabled={isPending}>
            {isPending ? "Saving..." : "Set new password"}
          </button>
        </form>
      </div>
    </div>
  );
}
