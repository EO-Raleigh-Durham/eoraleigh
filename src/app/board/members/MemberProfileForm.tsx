"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { RosterMember } from "@/lib/people";
import { updateMemberProfile } from "./actions";

// Editable Contact section on the member detail page: name, phone, city.
// Email is intentionally omitted: it is the canonical match key and stays
// read-only (shown in the page header). Saves via updateMemberProfile, then
// refreshes so the header and the roster reflect the change.
export function MemberProfileForm({ member }: { member: RosterMember }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [status, setStatus] = useState<"idle" | "saved" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  function handleSubmit(formData: FormData) {
    setStatus("idle");
    setError(null);
    startTransition(async () => {
      const res = await updateMemberProfile(member.id, formData);
      if (res.ok) {
        setStatus("saved");
        router.refresh();
      } else {
        setStatus("error");
        setError(res.error);
      }
    });
  }

  return (
    <section className="admin-shelf-section">
      <h3 className="admin-shelf-section-title">Contact</h3>
      <form action={handleSubmit} className="admin-form" style={{ maxWidth: "none" }}>
        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Name</span>
            <input
              name="name"
              type="text"
              defaultValue={member.name ?? ""}
              placeholder="Full name"
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Phone</span>
            <input
              name="phone"
              type="tel"
              defaultValue={member.phone ?? ""}
              placeholder="—"
            />
          </label>
        </div>
        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">City</span>
            <input
              name="city"
              type="text"
              defaultValue={member.city ?? ""}
              placeholder="—"
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Email</span>
            <input type="email" value={member.email} readOnly disabled />
            <span className="admin-hint">Email is the match key and cannot be edited here</span>
          </label>
        </div>
        <div className="admin-form-actions">
          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            disabled={pending}
          >
            {pending ? "Saving…" : "Save changes"}
          </button>
          <span className="admin-hint">
            {status === "saved"
              ? "Saved"
              : status === "error"
                ? error ?? "Could not save, try again"
                : ""}
          </span>
        </div>
      </form>
    </section>
  );
}
