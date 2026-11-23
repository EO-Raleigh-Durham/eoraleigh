"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import type { inviteUserAction } from "../actions";

type Props = {
  action: typeof inviteUserAction;
};

export function InviteUserForm({ action }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{ email: string; emailed: boolean; link: string } | null>(null);
  const [copied, setCopied] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setCopied(false);
      setSent({ email: result.email, emailed: result.emailed, link: result.link });
    });
  }

  if (sent) {
    return (
      <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
        <div style={{ padding: "12px 14px", background: "rgba(14,131,69,0.08)", color: "#0E5F35", borderRadius: 6, fontSize: 14 }}>
          {sent.emailed
            ? `Invite sent to ${sent.email}. The email has a link to sign in and choose a password.`
            : `Account created for ${sent.email}, but no email was sent because email is not set up. Send them this one-time link yourself (by email or chat). It signs them in once and asks them to choose a password.`}
        </div>
        {!sent.emailed && sent.link && (
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input
              readOnly
              value={sent.link}
              aria-label="One-time sign-in link"
              onFocus={(e) => e.currentTarget.select()}
              style={{ flex: 1, padding: "10px 12px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 13, fontFamily: "inherit" }}
            />
            <button
              type="button"
              onClick={() => {
                navigator.clipboard?.writeText(sent.link).then(() => setCopied(true), () => setCopied(false));
              }}
              style={{ padding: "10px 14px", background: "#3D46F2", color: "#fff", border: "none", borderRadius: 6, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
            >
              {copied ? "Copied" : "Copy link"}
            </button>
          </div>
        )}
        <p style={{ fontSize: 13, color: "#5E617D", margin: 0 }}>
          They can also sign in any time at /login with this email address.
        </p>
        <div style={{ display: "flex", gap: 12 }}>
          <button
            type="button"
            onClick={() => setSent(null)}
            style={{ padding: "10px 16px", background: "#fff", color: "#3D46F2", border: "1px solid #3D46F2", borderRadius: 6, fontSize: 14, fontWeight: 600, fontFamily: "inherit", cursor: "pointer" }}
          >
            Invite someone else
          </button>
          <Link href="/admin/users" style={{ padding: "10px 16px", color: "#3D46F2", fontSize: 14, fontWeight: 600 }}>
            Back to users
          </Link>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      {error && (
        <div style={{ padding: "10px 14px", background: "rgba(220,38,38,0.07)", color: "#991B1B", borderRadius: 6, fontSize: 14 }}>
          {error}
        </div>
      )}

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Email</span>
        <input
          name="email"
          type="email"
          required
          placeholder="user@example.com"
          style={{ padding: "10px 12px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 15, fontFamily: "inherit" }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Full name</span>
        <input
          name="full_name"
          type="text"
          required
          placeholder="Jane Doe"
          style={{ padding: "10px 12px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 15, fontFamily: "inherit" }}
        />
      </label>

      <label style={{ display: "flex", flexDirection: "column", gap: 6 }}>
        <span style={{ fontSize: 13, fontWeight: 600, color: "#374151" }}>Role</span>
        <select
          name="role"
          defaultValue="member"
          style={{ padding: "10px 12px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 15, fontFamily: "inherit", background: "#fff" }}
        >
          <option value="super_admin">Super Admin</option>
          <option value="board">Board</option>
          <option value="member">Member</option>
        </select>
      </label>

      <button
        type="submit"
        disabled={isPending}
        style={{ padding: "11px 20px", background: "#287BE8", color: "#fff", border: "none", borderRadius: 6, fontSize: 15, fontWeight: 600, fontFamily: "inherit", cursor: "pointer", opacity: isPending ? 0.6 : 1 }}
      >
        {isPending ? "Sending invite..." : "Send invite"}
      </button>
    </form>
  );
}
