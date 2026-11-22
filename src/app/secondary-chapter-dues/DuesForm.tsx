"use client";

import { useState } from "react";
import { createSecondaryDuesCheckout } from "./actions";

type Status = "idle" | "submitting" | "error";

export function SecondaryDuesForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const fd = new FormData(e.currentTarget);

    try {
      const res = await createSecondaryDuesCheckout(fd);
      if (!res.ok) {
        setError(res.error);
        setStatus("error");
        return;
      }
      window.location.href = res.checkoutUrl;
    } catch {
      setError("Network error. Please check your connection and try again.");
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} className="dur-form" noValidate>
      {error && (
        <div className="dur-form-error" role="alert">
          {error}
        </div>
      )}

      <label className="dur-field">
        <span className="dur-label">
          Full name <span aria-hidden="true" className="dur-req">*</span>
        </span>
        <input
          name="name"
          type="text"
          required
          autoComplete="name"
          placeholder="Your full name"
          className="dur-input"
        />
      </label>

      <label className="dur-field">
        <span className="dur-label">
          Email <span aria-hidden="true" className="dur-req">*</span>
        </span>
        <input
          name="email"
          type="email"
          required
          autoComplete="email"
          placeholder="you@company.com"
          className="dur-input"
        />
      </label>

      <label className="dur-field">
        <span className="dur-label">Company (optional)</span>
        <input
          name="company"
          type="text"
          autoComplete="organization"
          placeholder="Your company"
          className="dur-input"
        />
      </label>

      <button type="submit" disabled={status === "submitting"} className="dur-submit">
        {status === "submitting" ? "Redirecting to checkout..." : "Pay $1,500 by card"}
        {status !== "submitting" && (
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M3 8h10M9 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        )}
      </button>

      <p className="dur-footnote">
        Secure card payment via Stripe. You will be redirected to complete checkout
      </p>
    </form>
  );
}
