import Link from "next/link";
import { requireBoardOrAbove } from "@/lib/auth";
import { PREWORK_DEADLINE, PREWORK_DEADLINE_LABEL, PREWORK_TITLE, isPreworkOpen } from "@/lib/board-prework";
import { getMyPrework } from "@/lib/board-prework-store";
import { loadBoardSeats } from "@/lib/board-home";
import PreworkForm from "./PreworkForm";
import { CHAPTER_NAME, CHAPTER_TIME_ZONE, CHAPTER_TIME_ZONE_LABEL } from "@/kernel/config/chapter";

export const metadata = { title: "Board pre-work" };
export const dynamic = "force-dynamic";

export default async function BoardPreworkPage() {
  const user = await requireBoardOrAbove();
  const [mine, seats] = await Promise.all([getMyPrework(user.id), loadBoardSeats()]);
  // The board role comes from this year's board roster, not from the member.
  const role =
    seats
      .filter((s) => user.personId && s.personId === user.personId)
      .map((s) => s.roleName)
      .join(", ") || null;
  const open = isPreworkOpen();
  // "Tuesday 24 November": the last day the form is open, in the chapter's time zone.
  const closes = new Date(new Date(PREWORK_DEADLINE).getTime() - 1).toLocaleDateString("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: CHAPTER_TIME_ZONE,
  });

  return (
    <div className="bpw">
      <div className="admin-page-head">
        <div className="admin-eyebrow">Board</div>
        <h1 className="admin-page-title">{PREWORK_TITLE}</h1>
        <p className="admin-page-sub">
          To agree on what {CHAPTER_NAME} expects from its Board members and President, and to establish a
          principled foundation for FY2027–2028 leadership succession.
        </p>
      </div>


      {!open && (
        <div className="admin-banner admin-banner--warn" role="status">
          The worksheet closed at the end of {PREWORK_DEADLINE_LABEL}. Your answers below can no longer be
          changed. <Link href="/board/pre-work/report">Read the combined view</Link>
        </div>
      )}

      <PreworkForm
        name={user.fullName ?? user.email}
        role={role}
        initialAnswers={mine?.answers ?? {}}
        initialFinished={Boolean(mine?.submittedAt)}
        open={open}
        closes={closes}
      >
        <section className="frm-group bpw-intro">
          <p>
            Please complete independently (20 to 25 minutes). Be candid and specific. We are defining
            standards, not discussing names. Final selection must follow the applicable EO governance rules
            and {CHAPTER_NAME} bylaws.
          </p>
          <p>
            <strong>Due by the end of {PREWORK_DEADLINE_LABEL}, {CHAPTER_TIME_ZONE_LABEL}.</strong> Your answers save as
            you type, and whatever is saved at the deadline is what counts. Nobody else can open your
            worksheet. After the deadline the board reads one{" "}
            <Link href="/board/pre-work/report">combined view</Link> of everyone&rsquo;s answers, without
            names.
          </p>
        </section>
      </PreworkForm>

      <section className="frm-group bpw-intro">
        <div className="bpw-q-title">What happens next</div>
        <p>We will bring these reflections into the Board workshop to develop:</p>
        <ol>
          <li>a Board Member Charter,</li>
          <li>a President Leadership Profile, and</li>
          <li>an agreed selection framework consistent with EO governance.</li>
        </ol>
        <p className="bpw-motto">Lead to serve. Build to last.</p>
      </section>
    </div>
  );
}
