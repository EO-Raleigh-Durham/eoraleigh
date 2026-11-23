import { getRosterWithDetails } from "@/lib/people";
import { listForums } from "@/lib/forums";
import { requireBoardOrAbove } from "@/lib/auth";
import { canViewRevenue, redactMemberFinancials } from "@/lib/revenue-access";
import { MembersShell } from "./MembersShell";
import { AddMemberForm } from "./AddMemberForm";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Members",
  description: `The full ${CHAPTER_NAME} member roster with status, membership type, and forum.`,
};
export const dynamic = "force-dynamic";

export default async function MembersAdminPage() {
  const user = await requireBoardOrAbove();
  const [revenueAccess, roster, forums] = await Promise.all([
    canViewRevenue(user),
    getRosterWithDetails(),
    listForums(),
  ]);
  // Revenue is for the Finance and Membership chairs only — strip it
  // server-side for everyone else. Employee counts stay visible.
  const members = revenueAccess ? roster : roster.map(redactMemberFinancials);

  const active = members.filter((m) => m.membership_status === "active_member").length;
  const onLeave = members.filter((m) => m.membership_status === "on_leave").length;
  const primary = members.filter((m) => m.membership_type === "member").length;
  const secondary = members.filter((m) => m.membership_type === "secondary_member").length;

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Members</div>
        <h1 className="admin-page-title">{CHAPTER_NAME} member roster</h1>
        <p className="admin-page-sub">
          Active members and members on leave only. Alumni, SAPs, SLPs, and unclassified contacts are excluded from this view. Click a row to open details. HubSpot remains the source of truth for billing and renewal status.
        </p>
      </div>

      <div className="admin-card-grid" style={{ marginBottom: 32 }}>
        <Stat label="Total roster" value={members.length} />
        <Stat label="Active" value={active} />
        <Stat label="On leave" value={onLeave} />
        <Stat label="Primary / Secondary" value={`${primary} / ${secondary}`} />
      </div>

      <AddMemberForm />

      <MembersShell members={members} forums={forums} revenueAccess={revenueAccess} />
    </div>
  );
}

function Stat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="admin-card" style={{ cursor: "default" }}>
      <div className="admin-card-label">{label}</div>
      <div className="admin-card-title">{value}</div>
    </div>
  );
}
