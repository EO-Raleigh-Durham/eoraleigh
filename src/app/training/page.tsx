import { pageMeta } from "@/lib/page-metadata";
import { TrainingClient } from "./TrainingClient";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = pageMeta({
  title: `Leadership Training · ${CHAPTER_NAME}`,
  description:
    "Leadership programs for EO members: the Entrepreneurial Masters Program, KEY Executive programs for your leadership team, and chapter learning events.",
  path: "/training",
});

export default function TrainingPage() {
  return <TrainingClient />;
}
