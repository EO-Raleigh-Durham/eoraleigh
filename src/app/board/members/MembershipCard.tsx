"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { MEMBERSHIP_STATUS_OPTIONS, grantsMemberAccess, statusLabel } from "@/lib/membership-model";
import { changeMembershipStatusAction } from "./membership-actions";

type Membership = {
  id: string;
  status: string;
  membership_type: string;
  start_date: string | null;
  end_date: string | null;
};

const field: React.CSSProperties = {
  padding: "8px 10px", border: "1px solid #D1D5DB", borderRadius: 6, fontSize: 14, fontFamily: "inherit", background: "#fff",
};

export function MembershipCard({ membership }: { membership: Membership | null }) {
  const router = useRouter();
  const [status, setStatus] = useState(membership?.status ?? "active");
  const [endDate, setEndDate] = useState(membership?.end_date ?? "");
  const [pending, start] = useTransition();
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  if (!membership) {
    return (
      <section className="admin-shelf-section">
        <h3 className="admin-shelf-section-title">Membership</h3>
        <div className="admin-shelf-section-body">
          <div className="admin-shelf-placeholder">No membership on record</div>
        </div>
      </section>
    );
  }

  const changed = status !== membership.status || (!grantsMemberAccess(status) && endDate !== (membership.end_date ?? ""));
  const losing = grantsMemberAccess(membership.status) && !grantsMemberAccess(status);

  return (
    <section className="admin-shelf-section">
      <h3 className="admin-shelf-section-title">Membership</h3>
      <div className="admin-shelf-section-body">
        <p style={{ margin: "0 0 12px", fontSize: 14 }}>
          <strong>{statusLabel(membership.status)}</strong>
          {" · "}
          {membership.membership_type.replace(" Membership", "")}
          {membership.start_date ? ` · since ${membership.start_date}` : ""}
          {membership.end_date ? ` · ended ${membership.end_date}` : ""}
        </p>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "flex-end" }}>
          <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
            Status
            <select value={status} onChange={(e) => setStatus(e.target.value)} style={field}>
              {MEMBERSHIP_STATUS_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
          </label>
          {!grantsMemberAccess(status) && (
            <label style={{ fontSize: 13, display: "flex", flexDirection: "column", gap: 4 }}>
              End date
              <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} style={field} />
            </label>
          )}
          <button
            type="button"
            className="btn btn--primary"
            disabled={!changed || pending}
            onClick={() => {
              if (losing && !window.confirm("They will lose member-portal access the next time they sign in. Continue?")) return;
              setMsg(null);
              start(async () => {
                const r = await changeMembershipStatusAction(membership.id, status, endDate || null);
                setMsg(r.ok ? { ok: true, text: r.message } : { ok: false, text: r.error });
                if (r.ok) router.refresh();
              });
            }}
          >
            {pending ? "Saving..." : "Save"}
          </button>
        </div>
        {msg && (
          <p role="status" style={{ fontSize: 13, margin: "10px 0 0", color: msg.ok ? "#0E5F35" : "#991B1B" }}>{msg.text}</p>
        )}
        <p className="admin-table-meta" style={{ marginTop: 10 }}>
          Active and On leave can use the member portal. Any other status signs in as a guest; their history stays.
        </p>
      </div>
    </section>
  );
}
