import Link from "next/link";
import { getSurveys, statusLabel, type SurveyStatus } from "@/lib/surveys";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Surveys",
  description: `All ${CHAPTER_NAME} surveys with status and response counts.`,
};
export const dynamic = "force-dynamic";

const STATUS_BADGE: Record<SurveyStatus, string> = {
  published: "admin-badge--ok",
  draft: "admin-badge--muted",
  closed: "admin-badge--neutral",
};

type SearchParams = Promise<{ deleted?: string; error?: string }>;

export default async function SurveysPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const { deleted, error } = await searchParams;
  const surveys = await getSurveys();

  return (
    <div>
      <div className="admin-page-head admin-page-head--row">
        <div className="admin-page-head">
          <div className="admin-eyebrow">Surveys</div>
          <h1 className="admin-page-title">Surveys</h1>
          <p className="admin-page-sub">
            Build Typeform-style surveys, collect responses, and read the results
          </p>
        </div>
        <Link href="/board/surveys/new" className="admin-btn admin-btn--primary">
          New survey
        </Link>
      </div>

      {deleted && <div className="admin-banner admin-banner--ok">Survey deleted.</div>}
      {error && <div className="admin-banner admin-banner--err">{error}</div>}

      {surveys.length === 0 ? (
        <div className="admin-stub">
          <strong>No surveys yet</strong>
          Create your first survey to start collecting responses.
        </div>
      ) : (
        <div className="admin-list">
          {surveys.map((s) => (
            <Link
              key={s.id}
              href={`/board/surveys/${s.id}`}
              className="admin-list-item"
            >
              <div>
                <div className="admin-list-item-name">
                  {s.name}
                  <span className={`admin-badge ${STATUS_BADGE[s.status]}`} style={{ marginLeft: 10 }}>
                    {statusLabel(s.status)}
                  </span>
                </div>
                <div className="admin-list-item-meta">
                  {s.fieldCount} {s.fieldCount === 1 ? "question" : "questions"} ·{" "}
                  {s.responseCount} {s.responseCount === 1 ? "response" : "responses"}
                </div>
              </div>
              <span className="admin-list-item-meta">Open →</span>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
