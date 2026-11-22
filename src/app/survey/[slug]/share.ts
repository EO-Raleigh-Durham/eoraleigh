// Public link-preview copy for surveys shared by email, WhatsApp and Lark.
// The surveys.description column is internal (board-facing), so the share
// text lives here, keyed by slug, with a generic fallback.

import { CHAPTER_NAME } from "@/kernel/config/chapter";

export type SurveyShareCopy = {
  headline: string;
  description: string;
};

const SHARE_COPY: Record<string, SurveyShareCopy> = {
  "transformational-growth-pulse": {
    headline: "How is EO fuelling your growth?",
    description:
      "Your transformational growth is the board's ambition. Two minutes, three questions, and your answer shapes how we plan the second half of the year.",
  },
};

export function surveyShareCopy(
  slug: string,
  surveyName: string | null,
): SurveyShareCopy {
  return (
    SHARE_COPY[slug] ?? {
      headline: surveyName ?? `${CHAPTER_NAME} survey`,
      description: `A short survey for ${CHAPTER_NAME} members. It takes about two minutes.`,
    }
  );
}
