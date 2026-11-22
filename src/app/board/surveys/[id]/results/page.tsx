import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import {
  getSurveyById,
  getSurveyResponses,
  summarizeField,
  FIELD_TYPE_META,
} from "@/lib/surveys";
import { CHAPTER_NAME, CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

export const metadata = {
  title: "Survey results",
  description: `Responses and score breakdowns for one ${CHAPTER_NAME} survey.`,
};
export const dynamic = "force-dynamic";

const PULSE_SLUG = "transformational-growth-pulse";

type Params = Promise<{ id: string }>;

const dateFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: CHAPTER_TIME_ZONE,
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function SurveyResultsPage({ params }: { params: Params }) {
  const { id } = await params;
  const survey = await getSurveyById(id);
  if (!survey) notFound();

  // The Pulse keeps its bespoke board dashboard.
  if (survey.slug === PULSE_SLUG) redirect(`/board/surveys/${PULSE_SLUG}`);

  const responses = await getSurveyResponses(survey.id);
  const summaries = survey.fields.map((f) => summarizeField(f, responses));

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-breadcrumb">
          <Link href="/board/surveys">Surveys</Link>
          <span>/</span>
          <Link href={`/board/surveys/${survey.id}`}>{survey.name}</Link>
          <span>/</span>
          <span>Results</span>
        </div>
        <h1 className="admin-page-title">{survey.name} results</h1>
        <p className="admin-page-sub">
          {responses.length} {responses.length === 1 ? "response" : "responses"} collected
        </p>
      </div>

      {responses.length === 0 ? (
        <div className="admin-stub">
          <strong>No responses yet</strong>
          Share the public link from the survey page to start collecting.
        </div>
      ) : (
        <>
          <div className="svr-grid">
            {summaries.map((sum) => (
              <div key={sum.field.id} className="svr-card">
                <div className="svr-card-type">{FIELD_TYPE_META[sum.field.type].label}</div>
                <h3 className="svr-card-title">{sum.field.label}</h3>
                <div className="svr-card-meta">{sum.answered} answered</div>

                {sum.kind === "choice" && (
                  <div className="svr-bars">
                    {sum.options.map((o) => (
                      <div key={o.option} className="svr-bar-row">
                        <div className="svr-bar-label">
                          <span>{o.option}</span>
                          <span className="svr-bar-val">
                            {o.count} · {o.pct}%
                          </span>
                        </div>
                        <div className="svr-bar-track">
                          <div className="svr-bar-fill" style={{ width: `${o.pct}%` }} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {sum.kind === "rating" && (
                  <div>
                    <div className="svr-avg">
                      {sum.average}
                      <span className="svr-avg-unit">avg</span>
                    </div>
                    <div className="svr-bars">
                      {sum.distribution.map((d) => {
                        const max = Math.max(...sum.distribution.map((x) => x.count), 1);
                        return (
                          <div key={d.value} className="svr-bar-row">
                            <div className="svr-bar-label">
                              <span>{d.value}</span>
                              <span className="svr-bar-val">{d.count}</span>
                            </div>
                            <div className="svr-bar-track">
                              <div
                                className="svr-bar-fill"
                                style={{ width: `${Math.round((d.count / max) * 100)}%` }}
                              />
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {sum.kind === "number" && (
                  <div className="svr-stat-row">
                    <div className="svr-stat">
                      <div className="svr-stat-val">{sum.average}</div>
                      <div className="svr-stat-label">Average</div>
                    </div>
                    <div className="svr-stat">
                      <div className="svr-stat-val">{sum.min}</div>
                      <div className="svr-stat-label">Min</div>
                    </div>
                    <div className="svr-stat">
                      <div className="svr-stat-val">{sum.max}</div>
                      <div className="svr-stat-label">Max</div>
                    </div>
                  </div>
                )}

                {sum.kind === "text" && (
                  <div className="svr-quotes">
                    {sum.values.length === 0 ? (
                      <div className="admin-shelf-placeholder">No answers yet</div>
                    ) : (
                      sum.values.slice(0, 50).map((v, i) => (
                        <div key={i} className="svr-quote">
                          <p className="svr-quote-text">{v.value}</p>
                          {v.name && <div className="svr-quote-by">{v.name}</div>}
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>

          <div className="admin-section">
            <h2 className="admin-section-h2">Responses</h2>
            <p className="admin-section-desc">Most recent first</p>
            <div className="admin-table-wrap">
              <table className="admin-table">
                <thead>
                  <tr>
                    <th>Name</th>
                    <th>Email</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r) => (
                    <tr key={r.id}>
                      <td>{r.respondent_name ?? "Anonymous"}</td>
                      <td className="admin-table-meta">{r.respondent_email ?? ""}</td>
                      <td className="admin-table-meta">
                        {dateFmt.format(new Date(r.submitted_at))}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
