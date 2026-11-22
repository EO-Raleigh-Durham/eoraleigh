import Link from "next/link";
import { notFound } from "next/navigation";
import { getSurveyById } from "@/lib/surveys";
import { SurveyMetaForm } from "../SurveyMetaForm";
import { FieldEditor } from "../FieldEditor";
import { AddFieldForm } from "../AddFieldForm";
import { PublicLink } from "../PublicLink";

export const metadata = {
  title: "Edit survey",
  description: "Edit one survey's questions, status, and settings.",
};
export const dynamic = "force-dynamic";

const PULSE_SLUG = "transformational-growth-pulse";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string }>;

export default async function EditSurveyPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const { saved } = await searchParams;

  const survey = await getSurveyById(id);
  if (!survey) notFound();

  const isPulse = survey.slug === PULSE_SLUG;
  const resultsHref = isPulse
    ? `/board/surveys/${PULSE_SLUG}`
    : `/board/surveys/${survey.id}/results`;

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-breadcrumb">
          <Link href="/board/surveys">Surveys</Link>
          <span>/</span>
          <span>{survey.name}</span>
        </div>
        <h1 className="admin-page-title">{survey.name}</h1>
      </div>

      {saved && <div className="admin-banner admin-banner--ok">Saved.</div>}

      <div className="svb-toolbar">
        <Link href={resultsHref} className="admin-btn admin-btn--ghost">
          {isPulse ? "View report" : "View results"}
        </Link>
        <PublicLink slug={survey.slug} published={survey.status === "published"} />
      </div>

      <SurveyMetaForm survey={survey} />

      <div className="admin-section">
        <div className="admin-section-head">
          <h2 className="admin-section-h2">Questions</h2>
          <span className="admin-section-desc" style={{ margin: 0 }}>
            {survey.fields.length} {survey.fields.length === 1 ? "question" : "questions"}
          </span>
        </div>
        <p className="admin-section-desc">
          Respondents answer one question per screen, in this order. Drag is not
          needed: use the up and down arrows to reorder
        </p>

        <div className="svb-fields">
          {survey.fields.map((field, i) => (
            <FieldEditor
              key={field.id}
              field={field}
              surveyId={survey.id}
              isFirst={i === 0}
              isLast={i === survey.fields.length - 1}
            />
          ))}
        </div>

        <AddFieldForm surveyId={survey.id} />
      </div>
    </div>
  );
}
