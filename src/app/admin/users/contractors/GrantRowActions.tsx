"use client";

import { useState, useTransition } from "react";
import type { renewGrantAction, revokeGrantAction, setGrantEditAction } from "./actions";

type Props = {
  grantId: string;
  canEdit: boolean;
  defaultExpiry: string;
  renew: typeof renewGrantAction;
  setEdit: typeof setGrantEditAction;
  revoke: typeof revokeGrantAction;
};

export function GrantRowActions({ grantId, canEdit, defaultExpiry, renew, setEdit, revoke }: Props) {
  const [expiresAt, setExpiresAt] = useState(defaultExpiry);
  const [confirmRevoke, setConfirmRevoke] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function run(call: () => Promise<{ ok: true } | { ok: false; error: string }>) {
    setError(null);
    startTransition(async () => {
      const result = await call();
      if (!result.ok) setError(result.error);
      setConfirmRevoke(false);
    });
  }

  return (
    <div className="admin-review-cell">
      <input
        type="date"
        aria-label="New expiry date"
        value={expiresAt}
        onChange={(e) => setExpiresAt(e.target.value)}
        disabled={isPending}
      />
      <button
        type="button"
        className="admin-link-action"
        disabled={isPending}
        onClick={() => run(() => renew(grantId, expiresAt))}
      >
        Renew
      </button>
      <button
        type="button"
        className="admin-link-action admin-link-action--muted"
        disabled={isPending}
        onClick={() => run(() => setEdit(grantId, !canEdit))}
      >
        {canEdit ? "Make view only" : "Allow edit"}
      </button>
      {confirmRevoke ? (
        <>
          <button
            type="button"
            className="admin-link-action admin-link-action--danger"
            disabled={isPending}
            onClick={() => run(() => revoke(grantId))}
          >
            Confirm revoke
          </button>
          <button
            type="button"
            className="admin-link-action admin-link-action--muted"
            disabled={isPending}
            onClick={() => setConfirmRevoke(false)}
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          className="admin-link-action admin-link-action--danger"
          disabled={isPending}
          onClick={() => setConfirmRevoke(true)}
        >
          Revoke
        </button>
      )}
      {error && <span className="admin-badge admin-badge--err">{error}</span>}
    </div>
  );
}
