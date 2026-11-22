"use client";

import { useRef, useState, useTransition } from "react";
import type { addContractorAction } from "./actions";

type Props = {
  action: typeof addContractorAction;
  sponsors: { id: string; name: string }[];
  defaultExpiry: string;
};

export function AddContractorForm({ action, sponsors, defaultExpiry }: Props) {
  const formRef = useRef<HTMLFormElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [saved, setSaved] = useState(false);
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setSaved(false);
    const formData = new FormData(e.currentTarget);
    startTransition(async () => {
      const result = await action(formData);
      if (result.ok) {
        setSaved(true);
        formRef.current?.reset();
      } else {
        setError(result.error);
      }
    });
  }

  return (
    <form ref={formRef} onSubmit={handleSubmit} className="admin-form">
      {error && <div className="admin-banner admin-banner--err">{error}</div>}
      {saved && <div className="admin-banner admin-banner--ok">Access granted.</div>}

      <div className="admin-form-row admin-form-row--2">
        <label className="admin-field">
          <span className="admin-label">Full name</span>
          <input name="full_name" type="text" required />
        </label>
        <label className="admin-field">
          <span className="admin-label">Email</span>
          <input name="email" type="email" required />
        </label>
      </div>

      <div className="admin-form-row admin-form-row--2">
        <label className="admin-field">
          <span className="admin-label">Area</span>
          <select name="area" defaultValue="sap_pipeline">
            <option value="sap_pipeline">SAP pipeline</option>
          </select>
        </label>
        <label className="admin-field">
          <span className="admin-label">Sponsor</span>
          <select name="sponsor_person_id" required defaultValue="">
            <option value="" disabled>
              Pick a Chair or Co-Chair
            </option>
            {sponsors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="admin-form-row admin-form-row--2">
        <label className="admin-field">
          <span className="admin-label">Access</span>
          <select name="access" defaultValue="edit">
            <option value="edit">Edit (no delete)</option>
            <option value="view">View only</option>
          </select>
        </label>
        <label className="admin-field">
          <span className="admin-label">Expires (last day of access)</span>
          <input name="expires_at" type="date" required defaultValue={defaultExpiry} />
        </label>
      </div>

      <div className="admin-form-actions">
        <button type="submit" className="admin-btn admin-btn--primary" disabled={isPending}>
          {isPending ? "Granting..." : "Grant access"}
        </button>
      </div>
    </form>
  );
}
