import { pageMeta } from "@/lib/page-metadata";
import { DirectoryClient } from "./DirectoryClient";
import { CHAPTER_NAME } from "@/kernel/config/chapter";
import { DIRECTORY_PAGE_TITLE } from "@/content/directory-members";

export const metadata = pageMeta({
  title: DIRECTORY_PAGE_TITLE,
  description:
    `Browse ${CHAPTER_NAME}'s founder members across legal, manufacturing, tech, healthcare, retail, hospitality, and more. Members get direct intros to 20,000 EO members worldwide.`,
  path: "/directory",
});

export default function MemberDirectoryPage() {
  return <DirectoryClient />;
}
