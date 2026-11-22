import Link from "next/link";
import { getEoStaff } from "@/lib/deals";
import { OnboardingForm } from "../OnboardingForm";
import "../../funnel.css";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "New onboarding deal",
  description: `Add an incoming member to the ${CHAPTER_NAME} onboarding pipeline.`,
};
export const dynamic = "force-dynamic";

export default async function NewOnboardingPage() {
  const staff = await getEoStaff();

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">
          <Link href="/board/onboarding">Onboarding</Link>
        </div>
        <h1 className="admin-page-title">New deal</h1>
        <p className="admin-page-sub">
          Add a deal to the Onboarding Track pipeline. Link an existing contact
          and company, or create new ones inline.
        </p>
      </div>

      <OnboardingForm staff={staff} />
    </div>
  );
}
