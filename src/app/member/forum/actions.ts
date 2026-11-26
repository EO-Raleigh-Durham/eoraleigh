"use server";

import { revalidatePath } from "next/cache";
import { requireMemberOrAbove } from "@/lib/auth";
import { sendForumDateEmail } from "@/lib/email";
import { getForumOverview } from "@/lib/forums";
import { getForumModeratorId, getPersonForum, saveForumMeeting } from "@/lib/forum-meetings";
import { dayLabel, forumAccess, meetingIcs, monthLabel, timeLabel, validateMeeting, type MeetingInput } from "@/lib/forum-dates";
import { chapterToday } from "@/kernel/config/dates";
import { fyLabel, fyStartForDate } from "@/lib/fiscal-year";
import { CHAPTER_DOMAIN, CHAPTER_SITE_URL, CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

// The moderator sets or changes their own forum's date for one month. The
// forum is never taken from the browser: it is the forum the signed-in member
// is placed in, and they must be its named moderator for that month's fiscal year.
export async function saveForumDate(
  input: MeetingInput,
): Promise<{ ok: true; emailed: number } | { ok: false; error: string }> {
  const user = await requireMemberOrAbove();
  const mine = user.personId ? await getPersonForum(user.personId) : null;
  if (!user.personId || !mine?.forumId) return { ok: false, error: "You are not in a forum." };

  const checked = validateMeeting(input, chapterToday());
  if (!checked.ok) return checked;

  // Moderators change with the fiscal year on 1 July: a month is set by the
  // moderator for the fiscal year it falls in.
  const year = fyStartForDate(checked.value.month);
  const access = forumAccess({
    personId: user.personId,
    personForumId: mine.forumId,
    forumId: mine.forumId,
    moderatorPersonId: await getForumModeratorId(mine.forumId, year),
  });
  if (!access.canSet) return { ok: false, error: `Only the forum's ${fyLabel(year)} moderator can set that date.` };

  const meeting = await saveForumMeeting(mine.forumId, user.personId, checked.value);
  if (!meeting) return { ok: false, error: "Could not save the date. Try again." };

  const { forums } = await getForumOverview();
  const forum = forums.find((f) => f.id === mine.forumId);
  const emailed = forum
    ? await sendForumDateEmail({
        recipients: forum.members.map((m) => ({ email: m.email, name: m.name })),
        forumName: forum.name,
        month: monthLabel(meeting.month),
        when: `${dayLabel(meeting.meetsOn)}, ${timeLabel(meeting.startTime)}`,
        place: meeting.place,
        pageUrl: `${CHAPTER_SITE_URL}/member/forum`,
        ics: meetingIcs({
          forumId: forum.id,
          forumName: forum.name,
          meeting,
          timeZone: CHAPTER_TIME_ZONE,
          domain: CHAPTER_DOMAIN,
        }),
      })
    : 0;

  revalidatePath("/member/forum");
  return { ok: true, emailed };
}
