"use client";

import { useState } from "react";
import {
  RISE4_REVENUE_SCALE_OPTIONS,
  RISE4_ROLE_OPTIONS,
  roleRequiresCompany,
  roleRequiresRevenueScale,
} from "@/lib/rise4-guest-vetting";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

type Status = "idle" | "submitting" | "success" | "error";

export function InterestForm() {
  const [status, setStatus] = useState<Status>("idle");
  const [error, setError] = useState<string | null>(null);
  const [membership, setMembership] = useState("");
  const [role, setRole] = useState("");

  const notMember = membership === "not_yet";
  const needsRevenue = notMember && roleRequiresRevenueScale(role);
  const needsCompany = notMember && roleRequiresCompany(role);

  function chooseRole(next: string) {
    setRole(next);
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setStatus("submitting");
    setError(null);

    const form = e.currentTarget;
    const value = (field: string) =>
      (form.elements.namedItem(field) as HTMLInputElement | HTMLSelectElement).value.trim();
    const name = value("name");
    const email = value("email");

    if (!membership) {
      setError("Please tell us if you are already a member.");
      setStatus("error");
      return;
    }
    if (!name || !email) {
      setError("Please add your name and email.");
      setStatus("error");
      return;
    }
    if (notMember && !role) {
      setError("Please choose your role.");
      setStatus("error");
      return;
    }
    if (needsRevenue && !value("revenue_scale")) {
      setError("Please choose your revenue scale.");
      setStatus("error");
      return;
    }
    if (needsCompany && !value("company")) {
      setError("Please add your company.");
      setStatus("error");
      return;
    }

    try {
      const res = await fetch("/api/leadership-interest", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          email,
          membership,
          role_in_company: notMember ? role : "",
          company: needsCompany ? value("company") : "",
          revenue_scale: needsRevenue ? value("revenue_scale") : "",
          website: value("website"),
        }),
      });
      const data = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "Something went wrong. Please try again.");
        setStatus("error");
        return;
      }
      setStatus("success");
    } catch {
      setError("Something went wrong. Please try again.");
      setStatus("error");
    }
  }

  if (status === "success") {
    return (
      <div className="aie-form-success">
        <h3 className="aie-form-success-title">You are on the list</h3>
        <p className="aie-form-success-body">Thank you. Dates will come to you by email once they are confirmed.</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="aie-form" noValidate>
      {status === "error" && error && (
        <div className="aie-form-error" role="alert">
          {error}
        </div>
      )}

      <div className="aie-form-row">
        <label className="aie-form-field">
          <span className="aie-form-label">Are you already an {CHAPTER_NAME} member?</span>
          <select
            name="membership"
            required
            value={membership}
            onChange={(e) => {
              setMembership(e.target.value);
              if (e.target.value !== "not_yet") setRole("");
            }}
            className="aie-form-input aie-form-select"
          >
            <option value="">Select</option>
            <option value="member">Yes, I am a member</option>
            <option value="not_yet">Not a member yet</option>
          </select>
        </label>
      </div>

      <div className="aie-form-row">
        <label className="aie-form-field">
          <span className="aie-form-label">Full name</span>
          <input
            name="name"
            type="text"
            autoComplete="name"
            required
            className="aie-form-input"
          />
        </label>
        <label className="aie-form-field">
          <span className="aie-form-label">Email</span>
          <input
            name="email"
            type="email"
            autoComplete="email"
            required
            className="aie-form-input"
          />
        </label>
      </div>

      {notMember && (
        <>
          <div className="aie-form-row">
            <label className="aie-form-field">
              <span className="aie-form-label">Role</span>
              <select
                name="role_in_company"
                required
                value={role}
                onChange={(e) => chooseRole(e.target.value)}
                className="aie-form-input aie-form-select"
              >
                <option value="">Select role</option>
                {RISE4_ROLE_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            {needsRevenue && (
              <label className="aie-form-field">
                <span className="aie-form-label">Revenue Scale</span>
                <select
                  name="revenue_scale"
                  required
                  defaultValue=""
                  className="aie-form-input aie-form-select"
                >
                  <option value="">Select revenue scale</option>
                  {RISE4_REVENUE_SCALE_OPTIONS.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
            )}
          </div>
          {needsCompany && (
            <div className="aie-form-row">
              <label className="aie-form-field">
                <span className="aie-form-label">Company</span>
                <input
                  name="company"
                  type="text"
                  required
                  autoComplete="organization"
                  placeholder="Company name"
                  className="aie-form-input"
                />
              </label>
            </div>
          )}
        </>
      )}

      {/* Honeypot: hidden from people, filled by bots. */}
      <input
        name="website"
        type="text"
        tabIndex={-1}
        autoComplete="off"
        aria-hidden="true"
        style={{ position: "absolute", left: "-9999px", height: 0, width: 0, opacity: 0 }}
      />

      <button
        type="submit"
        disabled={status === "submitting"}
        className="aie-btn aie-btn--yellow aie-form-submit"
      >
        {status === "submitting" ? "Sending..." : "Send my details"}
      </button>
      <p
        className="aie-form-footnote"
        style={{ color: "rgba(255,255,255,0.8)", fontSize: 15 }}
      >
        We will reach out to you with further details once dates are confirmed.
      </p>
    </form>
  );
}
