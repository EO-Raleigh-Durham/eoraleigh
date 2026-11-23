import Link from "next/link";
import { requireSuperAdmin } from "@/lib/auth";
import { boardYearsInForce, loadAppointments, loadRoles, recordedYears } from "@/lib/board-team";
import { boardYearLabel, groupByRole, rolesWithoutChair, switcherYears, yearStatus } from "@/lib/board-team-model";
import { BoardTeamEditor } from "./BoardTeamEditor";

export const metadata = {
  title: "Board team",
  description: "Who holds each board role, by board year. Chairs and Co-Chairs get board access for their year.",
};

const STATUS_LABEL = { past: "past", current: "this year", next: "next year", future: "future" } as const;

export default async function BoardTeamPage({ searchParams }: { searchParams: Promise<{ year?: string }> }) {
  await requireSuperAdmin();
  const { todayFy, inForce } = await boardYearsInForce();
  const asked = Number((await searchParams).year);
  const year = Number.isInteger(asked) && asked >= 2000 && asked <= 2100 ? asked : todayFy;

  const [roles, appointments, years] = await Promise.all([loadRoles(), loadAppointments(year), recordedYears()]);
  const rows = groupByRole(roles, appointments);
  const missing = rolesWithoutChair(rows);
  const status = yearStatus(year, todayFy);
  const empty = appointments.length === 0;

  let effect: string;
  if (status === "next" || status === "future") {
    effect = `These people get board access on 1 July ${year}. Until then, nothing changes.`;
  } else if (inForce === year) {
    effect = "This board has access now. Adding someone gives them board access straight away; removing someone takes it away.";
  } else if (status === "current") {
    effect = `No board is entered for ${boardYearLabel(year)} yet, so the ${inForce ? boardYearLabel(inForce) : "previous"} board still has access. As soon as you add anyone here, this year's board takes over and last year's loses access, so enter the whole board at once.`;
  } else {
    effect = "A past year, kept as a record. It does not give anyone access.";
  }

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Administration</div>
        <h1 className="admin-page-title">Board team</h1>
        <p className="admin-page-sub">
          Who holds each board role, by board year (1 July to 30 June). Chairs and Co-Chairs get board access for their year.
          Enter next year&apos;s board in spring; it takes over on 1 July by itself.
        </p>
      </div>

      <nav aria-label="Board year" style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 }}>
        {switcherYears(years, todayFy).map((y) => (
          <Link
            key={y}
            href={`/admin/board-team?year=${y}`}
            aria-current={y === year ? "page" : undefined}
            className={y === year ? "btn btn--primary" : "btn"}
            style={{ textDecoration: "none" }}
          >
            {boardYearLabel(y)} · {STATUS_LABEL[yearStatus(y, todayFy)]}
          </Link>
        ))}
      </nav>

      <div
        role="status"
        style={{
          padding: "12px 16px",
          borderRadius: 8,
          marginBottom: 16,
          fontSize: 14,
          background: status === "past" ? "#F3F4F6" : "rgba(61,70,242,0.07)",
          borderLeft: `4px solid ${status === "past" ? "#9CA3AF" : "#3D46F2"}`,
        }}
      >
        <strong>{boardYearLabel(year)}.</strong> {effect}
        {!empty && missing.length > 0 && status !== "past" && (
          <div style={{ marginTop: 6, color: "#92400E" }}>
            {missing.length === 1 ? "1 role has" : `${missing.length} roles have`} no Chair: {missing.join(", ")}.
          </div>
        )}
      </div>

      <BoardTeamEditor
        year={year}
        rows={rows}
        status={status}
        liveYear={inForce === year}
        copyFrom={year - 1}
        offerCopy={empty && status !== "past"}
      />
    </div>
  );
}
