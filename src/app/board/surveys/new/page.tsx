import Link from "next/link";
import { NewSurveyForm } from "./NewSurveyForm";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "New survey",
  description: `Create a new survey for ${CHAPTER_NAME} members.`,
};

export default function NewSurveyPage() {
  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-breadcrumb">
          <Link href="/board/surveys">Surveys</Link>
          <span>/</span>
          <span>New</span>
        </div>
        <h1 className="admin-page-title">Create survey</h1>
        <p className="admin-page-sub">
          Name it to start. You will add questions and publish on the next screen
        </p>
      </div>
      <NewSurveyForm />
    </div>
  );
}
