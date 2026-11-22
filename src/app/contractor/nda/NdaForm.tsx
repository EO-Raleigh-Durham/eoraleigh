"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { acceptNda } from "./actions";
import { signOut } from "@/app/profile/actions";

// Accept is enabled only after the contractor has scrolled to the end of the
// agreement, ticked the box and typed their name. The server re-validates all
// of it except the scroll.
export function NdaForm({
  version,
  defaultName,
  preview = false,
  children,
}: {
  version: string;
  defaultName: string;
  preview?: boolean; // board review: everything works except Accept and Decline
  children: React.ReactNode;
}) {
  const [readToEnd, setReadToEnd] = useState(false);
  const [agreed, setAgreed] = useState(false);
  const [name, setName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function onScroll(e: React.UIEvent<HTMLDivElement>) {
    const el = e.currentTarget;
    if (el.scrollTop + el.clientHeight >= el.scrollHeight - 24) setReadToEnd(true);
  }

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res = await acceptNda(formData);
      if (res && !res.ok) setError(res.error);
    });
  }

  const canAccept = !preview && readToEnd && agreed && name.trim().length >= 3 && !pending;

  return (
    <>
      <div
        className="nda-text"
        tabIndex={0}
        onScroll={onScroll}
        ref={(el) => {
          // Short enough to need no scrolling: count it as read.
          if (el && el.scrollHeight <= el.clientHeight + 24) setReadToEnd(true);
        }}
      >
        {children}
      </div>
      {!readToEnd && <p className="nda-hint">Scroll to the end of the agreement to continue.</p>}

      <form action={submit} className="nda-form">
        <input type="hidden" name="version" value={version} />
        <label className="nda-check">
          <input
            type="checkbox"
            name="agreed"
            checked={agreed}
            onChange={(e) => setAgreed(e.target.checked)}
            disabled={!readToEnd}
          />
          I have read and agree to this agreement
        </label>
        <label className="nda-name">
          Type your full name to sign
          <input
            type="text"
            name="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder={defaultName || "Full name"}
            autoComplete="name"
            maxLength={120}
            disabled={!readToEnd}
          />
        </label>
        {error && <div className="admin-banner admin-banner--err">{error}</div>}
        <div className="nda-actions">
          <button type="submit" className="admin-btn admin-btn--primary" disabled={!canAccept}>
            {pending ? "Saving" : "Accept and continue"}
          </button>
          {preview ? (
            <Link href="/board/strategic-alliance-partners" className="admin-btn admin-btn--ghost">
              Back to SAP Partners
            </Link>
          ) : (
            <button type="submit" formAction={signOut} className="admin-btn admin-btn--ghost">
              Decline and sign out
            </button>
          )}
        </div>
      </form>
    </>
  );
}
