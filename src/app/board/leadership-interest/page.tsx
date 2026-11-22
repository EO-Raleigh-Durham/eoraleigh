import type { Metadata } from "next";
import { requireBoardOrAbove } from "@/lib/auth";
import { listLeadershipInterestSignups } from "@/lib/inquiries";
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

export const metadata: Metadata = {
  title: "Leadership interest list",
  description: "People who asked to hear about Leadership in the AI Era.",
};
export const dynamic = "force-dynamic";

function fmt(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    timeZone: CHAPTER_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default async function LeadershipInterestPage() {
  await requireBoardOrAbove();
  const signups = await listLeadershipInterestSignups();

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Leadership in the AI Era</div>
        <h1 className="admin-page-title">Interest list</h1>
        <p className="admin-page-sub">
          People who joined the interest list from the event page. {signups.length}{" "}
          {signups.length === 1 ? "sign-up" : "sign-ups"}.{" "}
          {signups.length > 0 && (
            <a href="/api/board/leadership-interest/export" download>
              Download CSV
            </a>
          )}
        </p>
      </div>

      {signups.length === 0 ? (
        <p className="admin-page-sub">No sign-ups yet.</p>
      ) : (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>EO member</th>
                <th>Role</th>
                <th>Company</th>
                <th>Revenue scale</th>
                <th>Submitted</th>
              </tr>
            </thead>
            <tbody>
              {signups.map((s) => (
                <tr key={s.id}>
                  <td>{s.name ?? ""}</td>
                  <td>{s.email ? <a href={`mailto:${s.email}`}>{s.email}</a> : ""}</td>
                  <td>{s.membership === "member" ? "Member" : s.membership === "not_yet" ? "Not yet" : ""}</td>
                  <td>{s.role ?? ""}</td>
                  <td>{s.company ?? ""}</td>
                  <td>{s.revenueScale ?? ""}</td>
                  <td>{fmt(s.createdAt)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
