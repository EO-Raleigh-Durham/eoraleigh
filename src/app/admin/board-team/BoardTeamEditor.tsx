"use client";

import { useEffect, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import type { EditablePosition, RoleRow, TeamAppointment, TeamPerson, YearStatus } from "@/lib/board-team-model";
import { appointAction, copyYearAction, removeAppointmentAction, searchPeopleAction } from "./actions";

type Props = {
  year: number;
  rows: RoleRow[];
  status: YearStatus;
  liveYear: boolean;
  copyFrom: number;
  offerCopy: boolean;
};

const label = (y: number) => `${y}/${String(y + 1).slice(2)}`;

const chip: React.CSSProperties = {
  display: "inline-flex", alignItems: "center", gap: 6, background: "#F5F6FB", border: "1px solid #E2E4EE",
  borderRadius: 999, padding: "3px 6px 3px 12px", fontSize: 13, margin: "2px 6px 2px 0",
};
const smallBtn: React.CSSProperties = {
  border: "1px solid #3D46F2", color: "#3D46F2", background: "#fff", borderRadius: 6, padding: "3px 10px",
  fontSize: 12, fontWeight: 600, cursor: "pointer", fontFamily: "inherit",
};
const th: React.CSSProperties = {
  padding: "10px 14px", textAlign: "left", fontWeight: 600, color: "#374151", fontSize: 12,
  textTransform: "uppercase", letterSpacing: "0.05em",
};

export function BoardTeamEditor({ year, rows, status, liveYear, copyFrom, offerCopy }: Props) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const [adding, setAdding] = useState<{ roleId: string; position: EditablePosition } | null>(null);

  function run(fn: () => Promise<{ ok: true; message?: string } | { ok: false; error: string }>) {
    setMessage(null);
    start(async () => {
      const r = await fn();
      if (r.ok) {
        setAdding(null);
        if (r.message) setMessage({ ok: true, text: r.message });
        router.refresh();
      } else {
        setMessage({ ok: false, text: r.error });
      }
    });
  }

  function remove(a: TeamAppointment, roleName: string) {
    const warn = liveYear
      ? `Remove ${a.person.name} as ${a.position} of ${roleName}? They lose board access now.`
      : `Remove ${a.person.name} as ${a.position} of ${roleName} for ${label(year)}?`;
    if (window.confirm(warn)) run(() => removeAppointmentAction(a.id));
  }

  const person = (a: TeamAppointment, roleName: string) => (
    <span key={a.id} style={chip}>
      {a.person.name}
      {a.position !== "Chair" && a.position !== "Co-Chair" ? ` (${a.position})` : ""}
      <button
        type="button"
        onClick={() => remove(a, roleName)}
        disabled={pending}
        aria-label={`Remove ${a.person.name}`}
        style={{ border: 0, background: "transparent", color: "#B91C1C", cursor: "pointer", fontSize: 15, lineHeight: 1, padding: "0 4px" }}
      >
        ×
      </button>
    </span>
  );

  return (
    <div>
      {message && (
        <div
          role="alert"
          style={{
            padding: "10px 14px", borderRadius: 6, marginBottom: 12, fontSize: 14,
            background: message.ok ? "rgba(14,131,69,0.08)" : "rgba(220,38,38,0.07)",
            color: message.ok ? "#0E5F35" : "#991B1B",
          }}
        >
          {message.text}
        </div>
      )}

      {offerCopy && (
        <div style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap" }}>
          <button
            type="button"
            className="btn"
            disabled={pending}
            onClick={() => run(() => copyYearAction(copyFrom, year))}
          >
            Start from {label(copyFrom)}
          </button>
          <span style={{ fontSize: 13, color: "#5E617D" }}>
            Copies last year&apos;s Chairs and Co-Chairs as a starting point; then change who moves on.
          </span>
        </div>
      )}

      <div style={{ background: "#fff", border: "1px solid #E5E7EB", borderRadius: 8, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 14 }}>
          <thead>
            <tr style={{ borderBottom: "1px solid #E5E7EB", background: "#F9FAFB" }}>
              <th style={th}>Role</th>
              <th style={th}>Chair</th>
              <th style={th}>Co-Chairs</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.role.id} style={{ borderBottom: "1px solid #F3F4F6", verticalAlign: "top" }}>
                <td style={{ padding: "12px 14px", fontWeight: 600, color: "#0C0C31", whiteSpace: "nowrap" }}>{r.role.name}</td>
                <td style={{ padding: "10px 14px" }}>
                  {r.chair ? person(r.chair, r.role.name) : adding?.roleId === r.role.id && adding.position === "Chair" ? null : (
                    <button type="button" style={smallBtn} disabled={pending} onClick={() => setAdding({ roleId: r.role.id, position: "Chair" })}>
                      + Choose Chair
                    </button>
                  )}
                  {adding?.roleId === r.role.id && adding.position === "Chair" && (
                    <PersonPicker
                      busy={pending}
                      onCancel={() => setAdding(null)}
                      onPick={(p) => run(() => appointAction({ year, roleId: r.role.id, position: "Chair", ...p }))}
                    />
                  )}
                </td>
                <td style={{ padding: "10px 14px" }}>
                  {r.coChairs.map((a) => person(a, r.role.name))}
                  {r.others.map((a) => person(a, r.role.name))}
                  {adding?.roleId === r.role.id && adding.position === "Co-Chair" ? (
                    <PersonPicker
                      busy={pending}
                      onCancel={() => setAdding(null)}
                      onPick={(p) => run(() => appointAction({ year, roleId: r.role.id, position: "Co-Chair", ...p }))}
                    />
                  ) : (
                    <button type="button" style={smallBtn} disabled={pending} onClick={() => setAdding({ roleId: r.role.id, position: "Co-Chair" })}>
                      + Add
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {status === "past" && (
        <p style={{ fontSize: 13, color: "#5E617D", marginTop: 10 }}>Editing a past year changes the record only.</p>
      )}
    </div>
  );
}

type Pick = { personId: string } | { newName: string; newEmail: string };

function PersonPicker({ onPick, onCancel, busy }: { onPick: (p: Pick) => void; onCancel: () => void; busy: boolean }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState<TeamPerson[]>([]);
  const [newPerson, setNewPerson] = useState(false);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");

  const searching = q.trim().length >= 2;
  useEffect(() => {
    if (q.trim().length < 2) return;
    let live = true;
    const t = setTimeout(() => {
      searchPeopleAction(q).then((r) => live && setResults(r));
    }, 250);
    return () => {
      live = false;
      clearTimeout(t);
    };
  }, [q]);

  const input: React.CSSProperties = {
    padding: "7px 10px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 14, fontFamily: "inherit", minWidth: 200,
  };

  return (
    <div style={{ marginTop: 6, padding: 10, border: "1px solid #E2E4EE", borderRadius: 8, background: "#FAFAFD", maxWidth: 380 }}>
      {!newPerson ? (
        <>
          <input autoFocus value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search members by name or email" style={{ ...input, width: "100%" }} />
          {searching && results.length > 0 && (
            <ul style={{ listStyle: "none", margin: "6px 0 0", padding: 0 }}>
              {results.map((p) => (
                <li key={p.id}>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => onPick({ personId: p.id })}
                    style={{ width: "100%", textAlign: "left", border: 0, background: "transparent", padding: "6px 4px", cursor: "pointer", fontFamily: "inherit", fontSize: 14 }}
                  >
                    <strong>{p.name}</strong> <span style={{ color: "#5E617D" }}>{p.email}</span>
                  </button>
                </li>
              ))}
            </ul>
          )}
          {searching && results.length === 0 && (
            <p style={{ fontSize: 13, color: "#5E617D", margin: "6px 0 0" }}>Nobody found.</p>
          )}
          <div style={{ display: "flex", gap: 12, marginTop: 8 }}>
            <button type="button" style={smallBtn} onClick={() => setNewPerson(true)}>Someone not on file</button>
            <button type="button" style={{ ...smallBtn, borderColor: "#D1D5DB", color: "#5E617D" }} onClick={onCancel}>Cancel</button>
          </div>
        </>
      ) : (
        <form
          onSubmit={(e) => {
            e.preventDefault();
            onPick({ newName: name, newEmail: email });
          }}
          style={{ display: "flex", flexDirection: "column", gap: 6 }}
        >
          <input autoFocus required value={name} onChange={(e) => setName(e.target.value)} placeholder="Full name" style={input} />
          <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="Email they sign in with" style={input} />
          <div style={{ display: "flex", gap: 12 }}>
            <button type="submit" disabled={busy} style={{ ...smallBtn, background: "#3D46F2", color: "#fff" }}>Add</button>
            <button type="button" style={{ ...smallBtn, borderColor: "#D1D5DB", color: "#5E617D" }} onClick={() => setNewPerson(false)}>Back</button>
          </div>
        </form>
      )}
    </div>
  );
}
