import type { Metadata } from "next";
import { requireBoardOrAbove } from "@/lib/auth";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = {
  title: "Staff Onboarding",
  description: `The onboarding guide for new ${CHAPTER_NAME} chapter staff.`,
};

export default async function StaffOnboardingPage() {
  await requireBoardOrAbove();

  // The chapter's staff onboarding guide, hosted separately. Unset, the page says how to add one.
  const guideUrl = (process.env.STAFF_ONBOARDING_URL ?? "").trim();
  if (!guideUrl) {
    return (
      <div className="sof-wrap">
        <p>No staff onboarding guide is linked yet. Set STAFF_ONBOARDING_URL to the guide&apos;s address to show it here.</p>
      </div>
    );
  }

  return (
    <div className="sof-wrap">
      <iframe
        src={guideUrl}
        className="sof-frame"
        title={`${CHAPTER_NAME} Staff Onboarding Guide`}
        allow="fullscreen"
      />
    </div>
  );
}
