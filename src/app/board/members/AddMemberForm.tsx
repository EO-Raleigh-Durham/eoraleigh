"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { MEMBERSHIP_TYPE_OPTIONS } from "@/lib/membership-model";
import { addMemberAction } from "./membership-actions";

const input: React.CSSProperties = {
  padding: "9px 12px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 14, fontFamily: "inherit", width: "100%",
};

export function AddMemberForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [pending, start] = useTransition();
  const [result, setResult] = useState<{ ok: boolean; text: string; personId?: string } | null>(null);
  const today = new Date().toISOString().slice(0, 10);

  if (!open) {
    return (
      <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 16 }}>
        <button type="button" className="btn btn--primary" onClick={() => { setOpen(true); setResult(null); }}>
          + Add member
        </button>
      </div>
    );
  }

  return (
    <form
      className="admin-card"
      style={{ cursor: "default", marginBottom: 24, display: "flex", flexDirection: "column", gap: 12, maxWidth: 640 }}
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const data = new FormData(form);
        start(async () => {
          const r = await addMemberAction(data);
          if (r.ok) {
            setResult({ ok: true, text: r.message, personId: r.personId });
            form.reset();
            router.refresh();
          } else {
            setResult({ ok: false, text: r.error });
          }
        });
      }}
    >
      <div className="admin-card-label">Add a member</div>
      {result && (
        <div
          role="status"
          style={{
            padding: "10px 12px", borderRadius: 6, fontSize: 14,
            background: result.ok ? "rgba(14,131,69,0.08)" : "rgba(220,38,38,0.07)",
            color: result.ok ? "#0E5F35" : "#991B1B",
          }}
        >
          {result.text}{" "}
          {result.ok && result.personId && <Link href={`/board/members/${result.personId}`}>Open their page</Link>}
        </div>
      )}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 12 }}>
        <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
          Full name
          <input name="name" required style={input} />
        </label>
        <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
          Email (they sign in with this)
          <input name="email" type="email" required style={input} />
        </label>
        <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
          Membership
          <select name="type" defaultValue="Primary Membership" style={{ ...input, background: "#fff" }}>
            {MEMBERSHIP_TYPE_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        </label>
        <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
          Start date
          <input name="start_date" type="date" defaultValue={today} style={input} />
        </label>
      </div>
      <p style={{ fontSize: 13, color: "#5E617D", margin: 0 }}>
        If this email belongs to someone already on file (a prospect or guest), their record is used. Add their company and forum on their page afterwards.
      </p>
      <div style={{ display: "flex", gap: 12 }}>
        <button type="submit" className="btn btn--primary" disabled={pending}>{pending ? "Adding..." : "Add member"}</button>
        <button type="button" className="btn" onClick={() => setOpen(false)}>Close</button>
      </div>
    </form>
  );
}
