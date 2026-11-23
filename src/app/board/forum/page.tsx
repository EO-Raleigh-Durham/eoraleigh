import Link from "next/link";
import {
  getForumOverview,
  PLACEMENT_LABEL,
  type ForumPerson,
  type ForumPlacement,
} from "@/lib/forums";
import { CHAPTER_NAME, CHAPTER_SHORT_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Forum",
  description: `Each ${CHAPTER_NAME} forum with its roster, plus members who still need a placement.`,
};
export const dynamic = "force-dynamic";

const MEMBERSHIP_TYPE_SHORT: Record<string, string> = {
  "Primary Membership": "Primary",
  "Secondary Membership": "Secondary",
};

// Group order, badge tone, and explanation for the "need placement" buckets.
// Action-needed groups first; resolved states (other chapter, no forum) last.
const PLACEMENT_GROUPS: { key: ForumPlacement; badge: string; note: string }[] = [
  {
    key: "forum_trained",
    badge: "admin-badge--ok",
    note: "Completed the Forum Training Program, ready to be placed",
  },
  {
    key: "unclassified",
    badge: "admin-badge--err",
    note: "No forum status on file. Needs review and placement",
  },
  {
    key: "waiting_ftp",
    badge: "admin-badge--neutral",
    note: "Awaiting the Forum Training Program before placement",
  },
  {
    key: "other_chapter",
    badge: "admin-badge--muted",
    note: "In a forum that belongs to another EO chapter",
  },
  {
    key: "no_forum",
    badge: "admin-badge--muted",
    note: "Not in a forum by choice",
  },
];

export default async function ForumAdminPage() {
  const { forums, unplaced, totals } = await getForumOverview();

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">Forum</div>
        <h1 className="admin-page-title">Forum rosters</h1>
        <p className="admin-page-sub">
          EO Forums are confidential peer groups, and every member belongs to
          one. Below is each {CHAPTER_SHORT_NAME} forum with its roster, followed by the active
          and on-leave members who still need placing. Live from the member
          database.
        </p>
      </div>

      <div className="admin-card-grid" style={{ marginBottom: 32 }}>
        <Stat label="Forums" value={totals.forums} />
        <Stat label="Placed members" value={totals.placed} />
        <Stat label="Need placement" value={totals.unplaced} />
        <Stat label="Total roster" value={totals.members} />
      </div>

      <div className="admin-section-title">Forums</div>
      <div className="frm-grid">
        {forums.map((f) => (
          <section key={f.id} className="frm-forum">
            <div className="frm-forum-head">
              <h2 className="frm-forum-name">
                <Link href={`/board/forum/${f.id}`}>{f.name}</Link>
              </h2>
              <span className="frm-forum-count">
                {f.members.length} {f.members.length === 1 ? "member" : "members"}
              </span>
            </div>
            {f.members.length === 0 ? (
              <p className="frm-empty">No members yet</p>
            ) : (
              <ul className="frm-roster">
                {f.members.map((m) => (
                  <PersonRow key={m.id} person={m} />
                ))}
              </ul>
            )}
          </section>
        ))}
      </div>

      <div className="admin-section-title" style={{ marginTop: 40 }}>
        Need placement · {totals.unplaced}
      </div>
      {unplaced.length === 0 ? (
        <div className="admin-stub">Every member is placed in a forum.</div>
      ) : (
        <div className="frm-unplaced">
          {PLACEMENT_GROUPS.map((g) => {
            const group = unplaced.filter((m) => m.placement === g.key);
            if (group.length === 0) return null;
            return (
              <section key={g.key} className="frm-group">
                <div className="frm-group-head">
                  <span className={`admin-badge ${g.badge}`}>
                    {PLACEMENT_LABEL[g.key]}
                  </span>
                  <span className="frm-group-count">{group.length}</span>
                  <span className="frm-group-note">{g.note}</span>
                </div>
                <ul className="frm-roster frm-roster--wide">
                  {group.map((m) => (
                    <PersonRow key={m.id} person={m} showEmail />
                  ))}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}

function PersonRow({
  person,
  showEmail = false,
}: {
  person: ForumPerson;
  showEmail?: boolean;
}) {
  const type =
    MEMBERSHIP_TYPE_SHORT[person.membershipType] ?? person.membershipType;
  const meta = [person.company, type].filter(Boolean).join(" · ");
  return (
    <li className="frm-person">
      <Link href={`/board/members/${person.id}`} className="frm-person-name">
        {person.name ?? person.email}
      </Link>
      <span className="frm-person-meta">{meta || "—"}</span>
      {showEmail && <span className="frm-person-email">{person.email}</span>}
    </li>
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
