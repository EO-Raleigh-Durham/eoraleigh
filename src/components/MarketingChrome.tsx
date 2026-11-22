"use client";

import { usePathname } from "next/navigation";
import { Topbar, type TopbarUser } from "./Topbar";
import { Footer } from "./Footer";

// Wraps marketing pages with site Topbar + Footer.
// Internal shells (/admin, the /board governance area, and the /member member
// area) opt out so they can render their own unified app shell. /board-of-directors
// is the PUBLIC board page and keeps the marketing chrome (it does not match
// "/board" + "/").
export function MarketingChrome({
  children,
  user,
}: {
  children: React.ReactNode;
  user?: TopbarUser | null;
}) {
  const pathname = usePathname();
  const isInternalShell =
    (pathname?.startsWith("/admin") ||
      pathname === "/board" ||
      pathname?.startsWith("/board/") ||
      pathname === "/member" ||
      pathname?.startsWith("/member/")) ??
    false;

  if (isInternalShell) {
    return <>{children}</>;
  }

  return (
    <>
      <Topbar user={user} />
      <main className="main">
        <div className="page-fade">{children}</div>
      </main>
      <Footer />
    </>
  );
}
