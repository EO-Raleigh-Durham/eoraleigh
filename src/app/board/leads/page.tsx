import { getLeads, leadName } from "@/lib/leads";
import { CHAPTER_DOMAIN } from "@/kernel/config/chapter";

export const metadata = {
  title: "Leads",
  description: `Membership leads captured from the join form on ${CHAPTER_DOMAIN}.`,
};
export const dynamic = "force-dynamic";

export default async function LeadsPage() {
  const leads = await getLeads();

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Membership Recruitment</div>
        <h1 className="admin-page-title">Leads</h1>
        <p className="admin-page-sub">
          People in the lead funnel by lifecycle stage. {leads.length}{" "}
          {leads.length === 1 ? "lead" : "leads"} on record
        </p>
      </div>

      {leads.length === 0 ? (
        <div className="admin-stub">
          <strong>No leads yet</strong>
          People with a Lead, Marketing Qualified Lead, or Sales Qualified Lead
          lifecycle stage will appear here.
        </div>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>First name</th>
                <th>Last name</th>
                <th>Company</th>
                <th>Email</th>
                <th>Phone</th>
                <th>Lead status</th>
              </tr>
            </thead>
            <tbody>
              {leads.map((l) => {
                const { first, last } = leadName(l);
                return (
                  <tr key={l.id}>
                    <td>{first || "—"}</td>
                    <td>{last || "—"}</td>
                    <td className="admin-table-meta">{l.company || "—"}</td>
                    <td className="admin-table-meta">{l.email}</td>
                    <td className="admin-table-meta">{l.phone || "—"}</td>
                    <td>
                      {l.lifecycle_stage ? (
                        <span className="admin-badge admin-badge--neutral">
                          {l.lifecycle_stage}
                        </span>
                      ) : (
                        "—"
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
