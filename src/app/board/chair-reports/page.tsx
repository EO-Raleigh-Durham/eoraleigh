import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { roleAtLeast } from "@/lib/access";
import { loadChairReports } from "@/lib/board-home";
import { ChairReportTable } from "../ChairReportTable";
import "../board-home.css";

export const metadata = { title: "Chair Reports" };
export const dynamic = "force-dynamic";

// Chair Reports: every board member's one goal, its status and their cards on
// one screen, off track first, so the whole board sees who needs help.
export default async function ChairReports() {
  const user = await getSessionUser();
  if (!user || !roleAtLeast(user.role, "board")) redirect("/admin/login");
  const reports = await loadChairReports();

  return (
    <div className="bh">
      <div className="admin-page-head">
        <div className="admin-eyebrow">Chapter</div>
        <h1 className="admin-page-title">Chair Reports</h1>
        <p className="admin-page-sub">Each board member&apos;s goal for FY26/27, off track first. Goals update on the 1st of each month.</p>
      </div>
      <section className="bh-panel">
        <ChairReportTable reports={reports} />
      </section>
    </div>
  );
}
