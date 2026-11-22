import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { grantState, type GrantState } from "@/lib/access-grants";
import { AREA_LABEL, defaultExpiry } from "@/lib/contractor-admin";
import { listContractorGrants, listSponsorOptions } from "@/lib/access-grants-admin";
import { AddContractorForm } from "./AddContractorForm";
import { GrantRowActions } from "./GrantRowActions";
import {
  addContractorAction,
  renewGrantAction,
  revokeGrantAction,
  setGrantEditAction,
} from "./actions";
import { CHAPTER_SITE_URL } from "@/kernel/config/chapter";

export const metadata = {
  title: "Contractors",
  description: "Grant, renew and revoke contractor access to board workspaces such as the SAP pipeline.",
};

export const dynamic = "force-dynamic";

const STATE_BADGE: Record<GrantState, { label: string; tone: string }> = {
  active: { label: "Active", tone: "ok" },
  nda_required: { label: "NDA pending", tone: "warn" },
  expired: { label: "Expired", tone: "err" },
  revoked: { label: "Revoked", tone: "muted" },
};

function formatDate(value: string): string {
  return new Date(`${value.slice(0, 10)}T00:00:00Z`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

export default async function ContractorsPage() {
  await requireSuperAdmin();
  const [grants, sponsors] = await Promise.all([listContractorGrants(), listSponsorOptions()]);
  const renewDefault = defaultExpiry();

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">
          <Link href="/admin/users">Users</Link>
        </div>
        <h1 className="admin-page-title">Contractors</h1>
        <p className="admin-page-sub">
          Non-members who help a chair in one workspace. They can edit but never delete, must accept the NDA on first
          sign-in, and lose access on the expiry date or when revoked.
        </p>
      </div>

      <section className="admin-section">
        <div className="admin-section-head">
          <h2 className="admin-section-title">Add contractor</h2>
        </div>
        <AddContractorForm action={addContractorAction} sponsors={sponsors} defaultExpiry={renewDefault} />
        <p className="admin-hint">
          Send them the sign-in link {CHAPTER_SITE_URL}/admin/login. For Claude, the connector URL is{" "}
          {CHAPTER_SITE_URL}/api/mcp?portfolio=sap and they sign in with the same account.
        </p>
      </section>

      <section className="admin-section">
        <div className="admin-section-head">
          <h2 className="admin-section-title">Access grants</h2>
        </div>
        {grants.length === 0 ? (
          <div className="admin-empty">No contractors yet.</div>
        ) : (
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Contractor</th>
                  <th>Area</th>
                  <th>Sponsor</th>
                  <th>Access</th>
                  <th>Expires</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {grants.map((g) => {
                  const state = grantState(g);
                  const badge = STATE_BADGE[state];
                  return (
                    <tr key={g.id}>
                      <td>
                        <div>{g.profile?.full_name ?? "Unnamed"}</div>
                        <div className="admin-table-meta">{g.profile?.email}</div>
                      </td>
                      <td className="admin-table-meta">{AREA_LABEL[g.area]}</td>
                      <td className="admin-table-meta">{g.sponsor?.name ?? "None"}</td>
                      <td className="admin-table-meta">{g.can_edit ? "Edit" : "View only"}</td>
                      <td className="admin-table-meta">{formatDate(g.expires_at)}</td>
                      <td>
                        <span className={`admin-badge admin-badge--${badge.tone}`}>{badge.label}</span>
                      </td>
                      <td>
                        {g.revoked_at ? (
                          <span className="admin-table-meta">Revoked {formatDate(g.revoked_at)}</span>
                        ) : (
                          <GrantRowActions
                            grantId={g.id}
                            canEdit={g.can_edit}
                            defaultExpiry={renewDefault}
                            renew={renewGrantAction}
                            setEdit={setGrantEditAction}
                            revoke={revokeGrantAction}
                          />
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
