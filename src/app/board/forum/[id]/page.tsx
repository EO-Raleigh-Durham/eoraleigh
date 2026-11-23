import Link from "next/link";
import { notFound } from "next/navigation";
import { requireBoardOrAbove } from "@/lib/auth";
import { getForumOverview } from "@/lib/forums";
import { getForumConstitution } from "@/lib/forum-constitutions";
import ConstitutionPanel from "./ConstitutionPanel";

export const metadata = { title: "Forum" };
export const dynamic = "force-dynamic";

const MEMBERSHIP_TYPE_SHORT: Record<string, string> = {
  "Primary Membership": "Primary",
  "Secondary Membership": "Secondary",
};

export default async function ForumDetailPage({ params }: { params: Promise<{ id: string }> }) {
  await requireBoardOrAbove();
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();

  const [{ forums }, constitution] = await Promise.all([getForumOverview(), getForumConstitution(id)]);
  const forum = forums.find((f) => f.id === id);
  if (!forum) notFound();

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">
          <Link href="/board/forum">Forum</Link>
        </div>
        <h1 className="admin-page-title">{forum.name}</h1>
        <p className="admin-page-sub">
          {forum.members.length} {forum.members.length === 1 ? "member" : "members"}. The roster and
          constitution are visible to the board only.
        </p>
      </div>

      <div className="admin-section-title">Constitution</div>
      <ConstitutionPanel
        forumId={forum.id}
        forumName={forum.name}
        current={
          constitution && {
            fileName: constitution.fileName,
            uploadedByName: constitution.uploadedByName,
            uploadedAt: constitution.uploadedAt,
          }
        }
      />

      <div className="admin-section-title" style={{ marginTop: 40 }}>
        Members
      </div>
      <section className="frm-group">
        {forum.members.length === 0 ? (
          <p className="frm-empty">No members yet</p>
        ) : (
          <ul className="frm-roster frm-roster--wide">
            {forum.members.map((m) => {
              const type = MEMBERSHIP_TYPE_SHORT[m.membershipType] ?? m.membershipType;
              return (
                <li key={m.id} className="frm-person">
                  <Link href={`/board/members/${m.id}`} className="frm-person-name">
                    {m.name ?? m.email}
                  </Link>
                  <span className="frm-person-meta">{[m.company, type].filter(Boolean).join(" · ") || "—"}</span>
                  <span className="frm-person-email">{m.email}</span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}
