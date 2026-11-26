import { getSessionUser } from "@/lib/auth";
import { listForums } from "@/lib/forums";
import { getPersonForum, listForumMeetings } from "@/lib/forum-meetings";
import { forumAccess, meetingIcs } from "@/lib/forum-dates";
import { CHAPTER_DOMAIN, CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

// The calendar file for one month of the signed-in member's own forum. There
// is no forum id in the address: a member can only ever fetch their own.
export async function GET(_request: Request, { params }: { params: Promise<{ month: string }> }) {
  const { month } = await params;
  const user = await getSessionUser();
  if (!user?.personId || !/^\d{4}-\d{2}$/.test(month)) return new Response("Not found", { status: 404 });

  const mine = await getPersonForum(user.personId);
  if (!mine?.forumId) return new Response("Not found", { status: 404 });
  const access = forumAccess({
    personId: user.personId,
    personForumId: mine.forumId,
    forumId: mine.forumId,
    moderatorPersonId: null,
  });
  if (!access.canView) return new Response("Not found", { status: 404 });

  const [meetings, forums] = await Promise.all([listForumMeetings(mine.forumId, `${month}-01`), listForums()]);
  const meeting = meetings.find((m) => m.month === `${month}-01`);
  const forum = forums.find((f) => f.id === mine.forumId);
  if (!meeting || !forum) return new Response("Not found", { status: 404 });

  return new Response(
    meetingIcs({
      forumId: forum.id,
      forumName: forum.name,
      meeting,
      timeZone: CHAPTER_TIME_ZONE,
      domain: CHAPTER_DOMAIN,
    }),
    {
      headers: {
        "Content-Type": "text/calendar; charset=utf-8",
        "Content-Disposition": `attachment; filename="forum-${month}.ics"`,
        "Cache-Control": "private, no-store",
      },
    },
  );
}
