import Link from "next/link";
import { requireBoardOrAbove } from "@/lib/auth";
import { PREWORK_DEADLINE_LABEL, PREWORK_TITLE, combineAnswers, isPreworkOpen } from "@/lib/board-prework";
import { getPreworkProgress, listPreworkAnswers } from "@/lib/board-prework-store";
import { CHAPTER_TIME_ZONE_LABEL } from "@/kernel/config/chapter";

export const metadata = { title: "Board pre-work: combined view" };
export const dynamic = "force-dynamic";

export default async function BoardPreworkReportPage() {
  await requireBoardOrAbove();
  const open = isPreworkOpen();

  const head = (sub: string) => (
    <div className="admin-page-head">
      <div className="admin-eyebrow">
        <Link href="/board/pre-work">Board pre-work</Link>
      </div>
      <h1 className="admin-page-title">Combined view</h1>
      <p className="admin-page-sub">{sub}</p>
    </div>
  );

  // Before the deadline: who has finished, and no answers at all.
  if (open) {
    const progress = await getPreworkProgress();
    return (
      <div className="bpw">
        {head(`${PREWORK_TITLE}. Everyone's answers appear here, without names, after the end of ${PREWORK_DEADLINE_LABEL} (${CHAPTER_TIME_ZONE_LABEL}).`)}
        <div className="admin-section-title">Finished so far</div>
        <section className="frm-group">
          {progress.finished.length === 0 ? (
            <p className="frm-empty">Nobody has marked their worksheet as finished yet</p>
          ) : (
            <ul className="bpw-done">
              {progress.finished.map((name, i) => (
                <li key={`${name}-${i}`}>{name}</li>
              ))}
            </ul>
          )}
          <p className="bpw-q-hint">
            {progress.finished.length} finished, {progress.drafts} still in draft. Answers stay private until
            the deadline. <Link href="/board/pre-work">Fill in yours</Link>
          </p>
        </section>
      </div>
    );
  }

  const responses = await listPreworkAnswers();
  const sections = combineAnswers(responses);

  return (
    <div className="bpw">
      {head(
        `${PREWORK_TITLE}. ${responses.length} board ${responses.length === 1 ? "member" : "members"} answered. Answers are shown without names and in a mixed order under each question.`,
      )}
      {sections.map((section) => (
        <div key={section.title}>
          <div className="admin-section-title">
            {section.number ? `${section.number} · ` : ""}
            {section.title}
          </div>
          {section.questions.map(({ question, blocks }) => (
            <section key={question.id} className="frm-group bpw-q">
              <div className="bpw-q-title">
                {question.number && <span className="bpw-q-num">{question.number}</span>}
                {question.title}
              </div>
              {blocks.map((block) => (
                <div key={block.label ?? "all"} className="bpw-block">
                  {block.label && <div className="admin-label">{block.label}</div>}
                  {block.entries.length === 0 ? (
                    <p className="frm-empty">No answers</p>
                  ) : (
                    <ul className="bpw-answers">
                      {block.entries.map((entry, i) => (
                        <li key={i}>
                          {entry.text}
                          {entry.note && <span className="bpw-note">{entry.note}</span>}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              ))}
            </section>
          ))}
        </div>
      ))}
    </div>
  );
}
