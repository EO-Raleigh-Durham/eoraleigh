import type { Metadata } from "next";
import { requireMemberOrAbove } from "@/lib/auth";
import { getForumOverview, PLACEMENT_LABEL, type ForumPlacement } from "@/lib/forums";
import { getPersonForum, listForumMeetings } from "@/lib/forum-meetings";
import { comingMonths, dayLabel, forumAccess, monthLabel, nextMeeting, timeLabel } from "@/lib/forum-dates";
import { chapterToday } from "@/kernel/config/dates";
import { CHAPTER_TIME_ZONE_LABEL } from "@/kernel/config/chapter";
import SetDatesPanel from "./SetDatesPanel";
import { fyLabel, fyStartForDate } from "@/lib/fiscal-year";

export const metadata: Metadata = { title: "My forum" };
export const dynamic = "force-dynamic";

export default async function MyForumPage() {
  const user = await requireMemberOrAbove();
  const mine = user.personId ? await getPersonForum(user.personId) : null;
  const { forums } = await getForumOverview();
  const forum = forums.find((f) => f.id === mine?.forumId);

  if (!forum || !user.personId) {
    const status = mine?.forumStatus as ForumPlacement | null | undefined;
    return (
      <div>
        <div className="admin-page-head">
          <div className="admin-eyebrow">My forum</div>
          <h1 className="admin-page-title">You are not in a forum yet</h1>
          <p className="admin-page-sub">
            {status && status in PLACEMENT_LABEL ? `Your forum status: ${PLACEMENT_LABEL[status]}. ` : ""}
            Use Contact the board to ask about joining a forum.
          </p>
        </div>
      </div>
    );
  }

  // Moderators change with the fiscal year on 1 July, so the coming months can
  // belong to two moderators: each month is set by the moderator for the
  // fiscal year it falls in.
  const moderatorFor = (month: string) =>
    fyStartForDate(month) === forum.moderatorYear ? forum.moderator : forum.nextModerator;
  const accessFor = (month: string) =>
    forumAccess({
      personId: user.personId,
      personForumId: mine?.forumId ?? null,
      forumId: forum.id,
      moderatorPersonId: moderatorFor(month)?.id ?? null,
    });
  const today = chapterToday();
  const months = comingMonths(today);
  const access = accessFor(months[0]);
  const settable = months.filter((month) => accessFor(month).canSet);
  const meetings = access.canView ? await listForumMeetings(forum.id, months[0]) : [];
  const next = nextMeeting(meetings, today);
  const byMonth = new Map(meetings.map((m) => [m.month, m]));

  return (
    <div className="frm-dates">
      <div className="admin-page-head" style={{ marginBottom: 0 }}>
        <div className="admin-eyebrow">
          {access.canSet
            ? "My forum · you are the moderator"
            : settable.length > 0
              ? `My forum · you are the ${fyLabel(fyStartForDate(settable[0]))} moderator`
              : "My forum"}
        </div>
        <h1 className="admin-page-title">{forum.name}</h1>
        <p className="admin-page-sub">
          Forum meets once a month. Only members of {forum.name} can see these dates.
        </p>
      </div>

      <section className="frm-group frm-next">
        <div className="admin-section-title" style={{ margin: 0 }}>Next forum</div>
        {next ? (
          <>
            <div className="frm-next-when">
              {dayLabel(next.meetsOn)} · {timeLabel(next.startTime)}
            </div>
            <div className="frm-person-meta">
              {[next.place, `${CHAPTER_TIME_ZONE_LABEL} time`].filter(Boolean).join(" · ")}
            </div>
            <div className="frm-month-actions">
              <a className="admin-btn admin-btn--primary" href={`/member/forum/calendar/${next.month.slice(0, 7)}`}>
                Add to calendar
              </a>
            </div>
          </>
        ) : (
          <p className="frm-empty">
            {forum.moderator
              ? `No date set yet. ${forum.moderator.name ?? "Your moderator"} sets it.`
              : "No date set yet. This forum has no moderator on record. Ask the chapter team to name one."}
          </p>
        )}
      </section>

      {settable.length > 0 ? (
        <SetDatesPanel
          months={months.map((month) => ({
            month,
            label: monthLabel(month),
            meeting: byMonth.get(month) ?? null,
            canSet: settable.includes(month),
            setBy: moderatorFor(month)?.name ?? null,
          }))}
          today={today}
        />
      ) : (
        <section className="frm-group">
          <div className="admin-section-title" style={{ marginTop: 0 }}>Coming months</div>
          {months.map((month) => {
            const m = byMonth.get(month);
            return (
              <div key={month} className="frm-month">
                <span className="frm-month-name">{monthLabel(month)}</span>
                {m ? (
                  <>
                    <span className="frm-month-when">
                      {dayLabel(m.meetsOn)} · {timeLabel(m.startTime)}
                      {m.place ? ` · ${m.place}` : ""}
                    </span>
                    <a className="admin-btn admin-btn--ghost" href={`/member/forum/calendar/${month.slice(0, 7)}`}>
                      Add to calendar
                    </a>
                  </>
                ) : (
                  <span className="frm-month-when frm-person-meta">Not set yet</span>
                )}
              </div>
            );
          })}
        </section>
      )}

      <section className="frm-group">
        <div className="admin-section-title" style={{ marginTop: 0 }}>
          Members · {forum.members.length}
        </div>
        <ul className="frm-roster">
          {forum.members.map((m) => (
            <li key={m.id} className="frm-person">
              <span className="frm-person-name">{m.name ?? m.email}</span>
              {forum.moderator?.id === m.id && (
                <span className="admin-badge admin-badge--ok frm-mod-tag">Moderator {fyLabel(forum.moderatorYear)}</span>
              )}
              {forum.nextModerator?.id === m.id && (
                <span className="admin-badge admin-badge--neutral frm-mod-tag">
                  Moderator {fyLabel(forum.moderatorYear + 1)}
                </span>
              )}
              {m.company && <span className="frm-person-meta">{m.company}</span>}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
