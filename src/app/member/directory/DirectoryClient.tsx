"use client";

import { useMemo, useState } from "react";
import type { DirectoryMember } from "@/lib/directory";
import { connectWithMember } from "./actions";

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}

export function DirectoryClient({ members }: { members: DirectoryMember[] }) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<DirectoryMember | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return members;
    return members.filter((m) =>
      [m.name, m.companyName, m.industry, m.city, m.headline]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(q)),
    );
  }, [members, query]);

  return (
    <>
      <div className="ptl-dir-search">
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by name, company, industry, or city"
          aria-label="Search the member directory"
          className="ptl-input"
        />
        <span className="ptl-dir-count">
          {filtered.length} of {members.length} members
        </span>
      </div>

      <ul className="ptl-dir-grid">
        {filtered.map((m) => (
          <li key={m.personId} className="ptl-dir-card">
            <div className="ptl-dir-avatar" aria-hidden="true">
              {m.photoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={m.photoUrl} alt="" />
              ) : (
                <span>{initials(m.name)}</span>
              )}
            </div>
            <div className="ptl-dir-body">
              <div className="ptl-dir-name">{m.name}</div>
              {m.headline && <div className="ptl-dir-headline">{m.headline}</div>}
              {(m.companyName || m.industry) && (
                <div className="ptl-dir-company">
                  {m.companyName}
                  {m.companyName && m.industry ? " · " : ""}
                  {m.industry}
                </div>
              )}
              {m.city && <div className="ptl-dir-city">{m.city}</div>}
            </div>
            <button
              type="button"
              className="btn btn--dark ptl-dir-connect"
              onClick={() => setActive(m)}
            >
              Connect
            </button>
          </li>
        ))}
      </ul>

      {filtered.length === 0 && (
        <p className="text-muted" style={{ marginTop: 24 }}>
          No members match that search.
        </p>
      )}

      {active && (
        <ConnectModal member={active} onClose={() => setActive(null)} />
      )}
    </>
  );
}

function ConnectModal({
  member,
  onClose,
}: {
  member: DirectoryMember;
  onClose: () => void;
}) {
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    setState("sending");
    setError(null);
    const res = await connectWithMember(member.personId, message);
    if (res.ok) {
      setState("done");
    } else {
      setError(res.error);
      setState("error");
    }
  }

  return (
    <div className="ptl-modal-backdrop" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="ptl-modal" onClick={(e) => e.stopPropagation()}>
        {state === "done" ? (
          <>
            <h2 className="ptl-modal-title">Message sent</h2>
            <p className="text-muted" style={{ marginBottom: 24 }}>
              We passed your note to {member.name}. If they would like to
              connect, they will reply to you directly.
            </p>
            <button type="button" className="btn btn--dark" onClick={onClose}>
              Done
            </button>
          </>
        ) : (
          <>
            <h2 className="ptl-modal-title">Connect with {member.name}</h2>
            <p className="text-muted" style={{ marginBottom: 16, fontSize: 14 }}>
              Write a short note. We email it to them on your behalf, so their
              contact details stay private. They can reply to you directly.
            </p>
            <textarea
              className="ptl-textarea"
              rows={5}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder={`Hi ${member.name.split(" ")[0]}, I'd love to connect because...`}
            />
            {error && <p className="ptl-form-error">{error}</p>}
            <div className="ptl-modal-actions">
              <button type="button" className="btn btn--ghost" onClick={onClose}>
                Cancel
              </button>
              <button
                type="button"
                className="btn btn--primary"
                disabled={state === "sending"}
                onClick={submit}
              >
                {state === "sending" ? "Sending…" : "Send message"}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
