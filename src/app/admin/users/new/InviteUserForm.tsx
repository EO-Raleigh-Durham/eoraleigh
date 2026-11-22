"use client";

import { useState, useTransition } from "react";
import type { inviteUserAction } from "../actions";

type Props = {
  action: typeof inviteUserAction;
};

export function InviteUserForm({ action }: Props) {
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(formData);
      if (!result.ok) {
        setError(result.error);
      }
      // On success, the server action redirects to /admin/users?invited=1
    });
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
