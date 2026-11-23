import type { Metadata } from "next";
import { PREWORK_DEADLINE_LABEL, PREWORK_TITLE } from "@/lib/board-prework";
import { pageMeta } from "@/lib/page-metadata";
import { nextPathname, safeNextPath } from "@/lib/safe-next";
import AdminLogin from "./AdminLoginForm";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

// Link previews never get past the login, so a shared link to a board page
// shows this page's card. The board pre-work worksheet gets a card of its own;
// every other destination keeps the site default.
export async function generateMetadata({
  searchParams,
}: {
  searchParams: Promise<{ next?: string | string[] }>;
}): Promise<Metadata> {
  const { next } = await searchParams;
  const safe = safeNextPath(typeof next === "string" ? next : null);
  const path = safe ? nextPathname(safe).replace(/\/+$/, "") : "";
  if (path !== "/board/pre-work" && !path.startsWith("/board/pre-work/")) return {};
  return pageMeta({
    title: PREWORK_TITLE,
    description: `For ${CHAPTER_NAME} board members: ten questions on what we expect from our Board and our President. 20 to 25 minutes, due by the end of ${PREWORK_DEADLINE_LABEL}.`,
    path: "/board/pre-work",
    image: "/og/board-pre-work",
    robots: { index: false, follow: false },
  });
}

export default function AdminLoginPage() {
  return <AdminLogin />;
}
