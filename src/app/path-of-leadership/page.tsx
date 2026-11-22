import { pageMeta } from "@/lib/page-metadata";
import { PathOfLeadershipClient } from "./PathOfLeadershipClient";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = pageMeta({
  title: "Path of Leadership · How EO Develops Member Leaders",
  description:
    `${CHAPTER_NAME}'s 8-step leadership development path, from new member to chapter and global leader. Includes executive programs at INSEAD, Wharton, Harvard, and Oxford.`,
  path: "/path-of-leadership",
});

export default function PathOfLeadershipPage() {
  return <PathOfLeadershipClient />;
}
