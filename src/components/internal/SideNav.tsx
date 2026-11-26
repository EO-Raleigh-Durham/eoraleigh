"use client";

import { CHAPTER_NAME } from "@/kernel/config/chapter";
import { useEffect, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Logo } from "@/components/Logo";
import type { UserRole } from "@/lib/access";
import { pageTier } from "@/lib/access-map";
import { roleAtLeast } from "@/lib/access";
import { signOut } from "@/app/profile/actions";
import { areaOptions } from "@/lib/area-switch";
import { grantAreaForPath } from "@/lib/access-grants";
import { myTools } from "@/lib/board-home-shared";

// The shared internal app shell sidebar, used by the /member area, /board, and
// /admin. The brand header carries the profile avatar (top-right) and the
// role-gated view switcher; the body renders the nav for the current `area`.

export type Area = "member" | "board" | "admin";

type Leaf = {
  label: string;
  href?: string;
  soon?: boolean;
  // Only render for viewers with revenue access (Finance/Membership chairs).
  revenueOnly?: boolean;
};
type Group = { key: string; label: string; href?: string; children: Leaf[] };
type Entry = Leaf | Group;
// A labelled band of the nav. An undefined label renders the entries with no
// section heading (used for the standalone top/utility links). A collapsible
// band (key set) folds its entries behind a clickable header; the band holding
// the active route starts open, the rest start collapsed.
type NavSection = {
  label?: string;
  key?: string;
  collapsible?: boolean;
  entries: Entry[];
};

const isGroup = (e: Entry): e is Group => "children" in e;

// Member nav (was PortalNav). Flat list. "My events" is the area's default
// landing (/member redirects there), so it leads.
const MEMBER_NAV: NavSection[] = [
  {
    entries: [
      { label: "My events", href: "/member/events" },
      { label: "Re-Qualify", href: "/member/requalify" },
      { label: "Chapter priorities", href: "/member/priorities" },
      { label: "Newsletters", href: "/member/newsletters" },
      { label: "Blog", href: "/member/blog" },
      { label: "Directory", href: "/member/directory" },
      { label: "My forum", href: "/member/forum" },
      { label: "Photos", href: "/member/photos" },
      { label: "Contact the board", href: "/member/contact-board" },
    ],
  },
];

// Governance nav — shared by the board and admin shells. Organised into bands:
// the chapter dashboard, the seven chair portfolios, the read-only reports, and
// settings. Chairs that own several tools expand to reveal them; single-page
// chairs are direct links. Leaf visibility is gated by route tier, so the
// Settings > Users link only renders for super_admins. Member Messages is not
// here: it lives in the brand-header inbox icon instead.
// Top band and Chapter band set by Dave, 20 Nov 2026: your commitments first,
// then the chapter's scoreboard; Workboards left the nav (cards show on My
// Commitments and the Workboard pages stay reachable from there).
const BOARD_NAV: NavSection[] = [
  {
    entries: [
      { label: "My Commitments", href: "/board" },
      { label: "Chapter Dashboard", href: "/board/chapter-dashboard" },
      { label: "Goals", href: "/board/goals" },
      { label: "Chair Reports", href: "/board/chair-reports" },
      { label: "Board Meetings", href: "/board/meetings" },
      { label: "Board pre-work", href: "/board/pre-work" },
    ],
  },
  {
    label: "Chapter",
    key: "sec-chapter",
    collapsible: true,
    entries: [
      { label: "Strategy", href: "/board/strategy" },
      { label: "Long Term Plan", href: "/board/long-term-plan" },
      { label: "On the Radar", href: "/board/radar" },
      { label: "Historical", href: "/board/historical-metrics" },
      { label: "Photos", href: "/board/photos" },
    ],
  },
  {
    label: "Chairs",
    key: "sec-chairs",
    collapsible: true,
    entries: [
      {
        key: "engagement",
        label: "Member Engagement",
        children: [
          { label: "Member Roster", href: "/board/members" },
          { label: "Surveys", href: "/board/surveys" },
          { label: "Onboarding", href: "/board/onboarding" },
        ],
      },
      {
        key: "membership",
        label: "Membership",
        children: [
          { label: "Prospects", href: "/board/prospects" },
          { label: "Leads", href: "/board/leads" },
          { label: "Requalification", href: "/board/requalification", revenueOnly: true },
        ],
      },
      { label: "Learning", href: "/board/events" },
      {
        key: "marketing",
        label: "Marketing",
        children: [
          { label: "Overview", href: "/board/marketing" },
          { label: "Calendar", href: "/board/marketing/calendar" },
          { label: "Campaigns", href: "/board/marketing/campaigns" },
          { label: "Registrations by platform", href: "/board/marketing/registrations" },
          { label: "Short links", href: "/board/marketing/links" },
          { label: "Leadership interest", href: "/board/leadership-interest" },
          { label: "Brands", href: "/board/marketing/brands" },
          { label: "Blog", href: "/board/blogs" },
          { label: "SEO", href: "/board/seo" },
        ],
      },
      { label: "Forum", href: "/board/forum" },
      {
        key: "alliance",
        label: "Strategic Alliance",
        children: [
          { label: "SAP Partners", href: "/board/strategic-alliance-partners" },
          { label: "Member Companies", href: "/board/member-companies" },
        ],
      },
      { label: "Finance", href: "/board/dues-invoices" },
      { label: "FY 2026 Handover", href: "/board/handover" },
    ],
  },
  {
    label: "Reports",
    key: "sec-reports",
    collapsible: true,
    entries: [
      { label: "Prospect Funnel", href: "/board/membership-pipeline" },
      { label: "Member Engagement", href: "/board/the-pulse-of-the-chapter" },
      { label: "Marketing", href: "/board/marketing" },
      { label: "Event Metrics", href: "/board/events/performance" },
    ],
  },
  {
    label: "Settings",
    key: "sec-settings",
    collapsible: true,
    entries: [
      { label: "System Overview", href: "/board/overview" },
      { label: "Staff Onboarding", href: "/board/staff-onboarding" },
      { label: "Users", href: "/admin/users" },
      { label: "Contractors", href: "/admin/users/contractors" },
      { label: "Board team", href: "/admin/board-team" },
    ],
  },
];

// Where the brand logo leads in each shell.
const HOME: Record<Area, string> = {
  member: "/member/events",
  board: "/board",
  admin: "/admin/users",
};

// Inbox tray glyph for the brand-header message icon.
function InboxIcon() {
  return (
    <svg
      width="20"
      height="20"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M22 12h-6l-2 3h-4l-2-3H2" />
      <path d="M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z" />
    </svg>
  );
}

// Collapse/expand caret for nav sections and groups. Points right when closed,
// rotates down when open (via CSS).
function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`admin-nav-chevron ${open ? "is-open" : ""}`.trim()}
      width="12"
      height="12"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2.5"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

function getInitials(fullName: string | null, email: string): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

// A nav leaf is visible if the viewer's role meets the tier of its destination
// and, for revenue-only leaves, the viewer has revenue access. Inert
// "soon"/no-href items are always shown.
function leafVisible(
  item: Leaf,
  role: UserRole | null | undefined,
  revenueAccess: boolean,
): boolean {
  if (item.revenueOnly && !revenueAccess) return false;
  if (role === "contractor") return !!item.href && !item.soon && grantAreaForPath(item.href) !== null;
  if (!item.href) return true;
  return roleAtLeast(role, pageTier(item.href));
}

// Longest-prefix match so e.g. /board/events/performance beats /board/events.
function resolveActiveHref(pathname: string, hrefs: string[]): string {
  let best = "";
  for (const h of hrefs) {
    // The area homes (/board) only match themselves, not every page below them.
    const prefix = h !== "/board" && pathname.startsWith(`${h}/`);
    if ((pathname === h || prefix) && h.length > best.length) {
      best = h;
    }
  }
  return best;
}

type Props = {
  area: Area;
  user: { fullName: string | null; email: string; role: UserRole };
  // Unread board-message count, drives the inbox badge. Board/admin shells pass
  // it; the member shell omits it (no inbox icon there).
  inboxCount?: number;
  // Whether the viewer may see member financials (canViewRevenue, computed by
  // the shell layout). Gates the revenue-only nav leaves.
  revenueAccess?: boolean;
  // The viewer's board_roles keys this fiscal year (plus "manager" for chapter
  // staff). Their tools are pulled up into a "My tools" band under My board;
  // every chair's tools stay under Chairs.
  myRoleKeys?: string[];
};

export function SideNav({ area, user, inboxCount = 0, revenueAccess = false, myRoleKeys = [] }: Props) {
  const pathname = usePathname() ?? "";

  // Governance shells (board/admin) share BOARD_NAV; the member shell uses
  // MEMBER_NAV. Both are sectioned. The inbox icon is governance-only.
  const tools = area === "member" ? [] : myTools(myRoleKeys);
  const nav: NavSection[] =
    area === "member"
      ? MEMBER_NAV
      : tools.length
        ? [BOARD_NAV[0], { label: "My tools", key: "sec-mytools", collapsible: true, entries: tools as Entry[] }, ...BOARD_NAV.slice(1)]
        : BOARD_NAV;
  const showInbox = area !== "member" && roleAtLeast(user.role, "board");

  const entries = nav.flatMap((s) => s.entries);
  const allHrefs: string[] = [];
  for (const e of entries) {
    if (isGroup(e)) {
      if (e.href) allHrefs.push(e.href);
      e.children.forEach((c) => c.href && allHrefs.push(c.href));
    } else if (e.href) {
      allHrefs.push(e.href);
    }
  }
  const activeHref = resolveActiveHref(pathname, allHrefs);

  const entryHasHref = (e: Entry, href: string) =>
    isGroup(e)
      ? e.href === href || e.children.some((c) => c.href === href)
      : e.href === href;

  const activeGroup = entries.find(
    (e): e is Group => isGroup(e) && entryHasHref(e, activeHref),
  );
  // The collapsible band that holds the active route — opened by default so the
  // user lands on an expanded section; the others start folded to cut clutter.
  const activeSectionKey = nav.find(
    (s) => s.collapsible && s.key && s.entries.some((e) => entryHasHref(e, activeHref)),
  )?.key;
  const [openKeys, setOpenKeys] = useState<Set<string>>(
    () => new Set([activeGroup?.key, activeSectionKey].filter((k): k is string => !!k)),
  );
  const isOpen = (key: string) => openKeys.has(key);
  function toggle(key: string) {
    setOpenKeys((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  }

  // Mobile drawer — below the 880px breakpoint the sidebar slides in off-canvas
  // behind a hamburger, instead of dumping the whole nav inline above content.
  const [mobileOpen, setMobileOpen] = useState(false);
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMobileOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = prev;
      document.removeEventListener("keydown", onKey);
    };
  }, [mobileOpen]);

  // Profile dropdown
  const [menuOpen, setMenuOpen] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const homeHref = HOME[area];
  // The area switcher (Public site, Member, Board, Admin), the same list the public
  // Topbar shows, with the current area highlighted. Shown in the profile
  // dropdown.
  const switchOptions = areaOptions(user.role, pathname);

  function leaf(item: Leaf, sub: boolean) {
    const cls = sub ? "admin-nav-sublink" : "admin-nav-link";
    if (item.soon || !item.href) {
      return (
        <span key={item.label} className={`${cls} admin-nav-soon`}>
          <span>{item.label}</span>
          <span className="admin-nav-soon-tag">Soon</span>
        </span>
      );
    }
    return (
      <Link
        key={item.label}
        href={item.href}
        className={`${cls} ${item.href === activeHref ? "is-active" : ""}`.trim()}
        onClick={() => setMobileOpen(false)}
      >
        {item.label}
      </Link>
    );
  }

  // Renders one nav entry: a single link, or a collapsible group of links.
  // Returns null when nothing the viewer's role can see remains.
  function renderEntry(entry: Entry) {
    if (!isGroup(entry)) {
      return leafVisible(entry, user.role, revenueAccess) ? leaf(entry, false) : null;
    }
    const visibleChildren = entry.children.filter((c) =>
      leafVisible(c, user.role, revenueAccess),
    );
    if (visibleChildren.length === 0) return null;
    const open = isOpen(entry.key);
    return (
      <div key={entry.key} className="admin-nav-group">
        <button
          type="button"
          className={`admin-nav-grouptoggle ${entry.href && entry.href === activeHref ? "is-active" : ""}`.trim()}
          onClick={() => toggle(entry.key)}
          aria-expanded={open}
        >
          <span>{entry.label}</span>
          <Chevron open={open} />
        </button>
        {open && (
          <div className="admin-nav-children">
            {visibleChildren.map((c) => leaf(c, true))}
          </div>
        )}
      </div>
    );
  }

  return (
    <>
      <div className="admin-mobilebar">
        <Link href={homeHref} className="admin-brand-link" aria-label={CHAPTER_NAME}>
          <Logo inverted size="sm" />
        </Link>
        <button
          type="button"
          className="admin-burger"
          aria-label="Open menu"
          aria-expanded={mobileOpen}
          onClick={() => setMobileOpen(true)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
      </div>

      {mobileOpen && (
        <div className="admin-scrim" onClick={() => setMobileOpen(false)} aria-hidden="true" />
      )}

      <aside className={`admin-sidebar ${mobileOpen ? "is-open" : ""}`.trim()}>
        <button
          type="button"
          className="admin-sidebar-close"
          aria-label="Close menu"
          onClick={() => setMobileOpen(false)}
        >
          ✕
        </button>
        <div className="admin-brand">
        <div className="admin-brand-row">
          <Link href={homeHref} className="admin-brand-link" aria-label={CHAPTER_NAME}>
            <Logo inverted size="sm" />
          </Link>
          <div className="admin-brand-actions">
            {showInbox && (
              <Link
                href="/board/inquiries"
                className="admin-inbox"
                aria-label={inboxCount > 0 ? `Inbox, ${inboxCount} new` : "Inbox"}
                onClick={() => setMobileOpen(false)}
              >
                <InboxIcon />
                {inboxCount > 0 && <span className="admin-inbox-dot" aria-hidden="true" />}
              </Link>
            )}
            <div className="admin-acct" ref={menuRef}>
            <button
              type="button"
              className="admin-acct-btn"
              aria-haspopup="true"
              aria-expanded={menuOpen}
              aria-label="Account menu"
              onClick={() => setMenuOpen((o) => !o)}
            >
              {getInitials(user.fullName, user.email)}
            </button>
            {menuOpen && (
              <div className="admin-acct-menu" role="menu">
                <div className="admin-acct-id">
                  {user.fullName && <div className="admin-acct-name">{user.fullName}</div>}
                  <div className="admin-acct-email">{user.email}</div>
                </div>
                {switchOptions.length > 1 && (
                  <div className="admin-acct-switch">
                    {switchOptions.map((s) => (
                      <Link
                        key={s.area}
                        href={s.href}
                        className={`admin-acct-link${s.current ? " is-current" : ""}`}
                        role="menuitem"
                        aria-current={s.current ? "page" : undefined}
                        onClick={() => setMenuOpen(false)}
                      >
                        {s.label}
                      </Link>
                    ))}
                  </div>
                )}
                <Link
                  href="/profile"
                  className="admin-acct-link"
                  role="menuitem"
                  onClick={() => setMenuOpen(false)}
                >
                  My profile
                </Link>
                <button
                  type="button"
                  className="admin-acct-link admin-acct-signout"
                  role="menuitem"
                  disabled={isSigningOut}
                  onClick={() => startSignOut(async () => { await signOut(); })}
                >
                  {isSigningOut ? "Signing out..." : "Sign out"}
                </button>
              </div>
            )}
            </div>
          </div>
        </div>
      </div>

      <nav className="admin-nav">
        {nav.map((section, i) => {
          const rendered = section.entries
            .map((e) => renderEntry(e))
            .filter((x) => x !== null);
          if (rendered.length === 0) return null;
          const key = section.key ?? section.label ?? `section-${i}`;

          if (section.collapsible && section.key) {
            const open = isOpen(section.key);
            return (
              <div key={key} className="admin-nav-section">
                <button
                  type="button"
                  className="admin-nav-sectiontoggle"
                  onClick={() => toggle(section.key!)}
                  aria-expanded={open}
                >
                  <span>{section.label}</span>
                  <Chevron open={open} />
                </button>
                {open && <div className="admin-nav-sectionbody">{rendered}</div>}
              </div>
            );
          }

          return (
            <div key={key} className="admin-nav-section">
              {section.label && (
                <div className="admin-nav-sectionlabel">{section.label}</div>
              )}
              {rendered}
            </div>
          );
        })}
      </nav>

      <div className="admin-foot">
        <img src="/images/internal/funtastic.png" alt="FUNtastic" className="admin-foot-img" />
        <span>Internal use only</span>
      </div>
      </aside>
    </>
  );
}
