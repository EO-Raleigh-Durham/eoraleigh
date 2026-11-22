"use client";

// A short "where to look next" strip inside the member and board areas of a
// public demo site. Shows only when the demo sign-ins are set (see
// DemoLoginHint); a real chapter never sees it.
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { demoLogins, signInAsDemo, type DemoRole } from "./DemoLoginHint";

const STOPS: Record<DemoRole, { href: string; label: string; hint: string }[]> = {
  member: [
    { href: "/member/events", label: "My events", hint: "Your tickets and what is coming up" },
    { href: "/member/directory", label: "Member directory", hint: "Find members by company or industry" },
    { href: "/member/newsletters", label: "Newsletters", hint: "Past chapter newsletters" },
    { href: "/member/priorities", label: "Chapter priorities", hint: "What the board is working on" },
  ],
  board: [
    { href: "/board", label: "Board home", hint: "Your goal, cards and the next meeting" },
    { href: "/board/chapter-dashboard", label: "Chapter dashboard", hint: "Members, revenue and events this year" },
    { href: "/board/members", label: "Members", hint: "Roster, pulse and re-qualification" },
    { href: "/board/events", label: "Events", hint: "RSVPs, attendance and feedback" },
    { href: "/board/prospects", label: "Prospects", hint: "Who to contact next to grow the chapter" },
    { href: "/board/goals", label: "Goals", hint: "Priorities and key results" },
    { href: "/board/workboards", label: "Workboards", hint: "Shared task boards" },
  ],
};

export function DemoGuide({ area }: { area: DemoRole }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  const [switching, setSwitching] = useState(false);
  const logins = demoLogins();
  if (logins.length === 0) return null;

  const other: DemoRole = area === "board" ? "member" : "board";
  const canSwitch = logins.some((l) => l.role === other);
  const home = process.env.NEXT_PUBLIC_DEMO_HOME_URL;

  async function switchView() {
    setSwitching(true);
    if (await signInAsDemo(other)) setSwitching(false);
  }

  return (
    <aside className="demo-guide" aria-label="Demo guide">
      <div className="demo-guide-head">
        <strong>Demo: you are in the {area === "board" ? "board portal" : "member portal"}</strong>
        <span className="demo-guide-note">Made-up data, reset every night</span>
        <div className="demo-guide-actions">
          {canSwitch && (
            <button type="button" className="demo-guide-btn" onClick={switchView} disabled={switching}>
              {switching ? "Switching..." : `Switch to the ${other === "board" ? "board" : "member"} portal`}
            </button>
          )}
          {home && (
            <a className="demo-guide-btn demo-guide-btn--ghost" href={home}>
              Demo home
            </a>
          )}
          <button type="button" className="demo-guide-btn demo-guide-btn--ghost" onClick={() => setOpen(!open)}>
            {open ? "Hide" : "Show"}
          </button>
        </div>
      </div>
      {open && (
        <>
          <ol className="demo-guide-stops" aria-label="Suggested pages">
            {STOPS[area].map((stop) => {
              const here = pathname === stop.href;
              return (
                <li key={stop.href} className={here ? "demo-guide-stop demo-guide-stop--here" : "demo-guide-stop"}>
                  <Link href={stop.href} title={stop.hint} aria-current={here ? "page" : undefined}>
                    {stop.label}
                  </Link>
                </li>
              );
            })}
          </ol>
          <p className="demo-guide-tip">
            {STOPS[area].find((stop) => stop.href === pathname)?.hint ?? "Pick a page to see what this portal does."}
          </p>
        </>
      )}
    </aside>
  );
}
