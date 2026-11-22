"use client";

import { CHAPTER_NAME } from "@/kernel/config/chapter";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useRef, useState, useTransition } from "react";
import { Logo } from "./Logo";
import { signOut } from "@/app/profile/actions";
import type { UserRole } from "@/lib/access";
import { areaOptions } from "@/lib/area-switch";

export type TopbarUser = {
  fullName: string | null;
  email: string;
  role: UserRole;
};

function getInitials(fullName: string | null, email: string): string {
  if (fullName) {
    const parts = fullName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return email.slice(0, 2).toUpperCase();
}

function TopbarAvatar({ user, inverted }: { user: TopbarUser; inverted: boolean }) {
  const [open, setOpen] = useState(false);
  const [isSigningOut, startSignOut] = useTransition();
  const ref = useRef<HTMLDivElement>(null);
  const pathname = usePathname() ?? "/";

  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  return (
    <div className="topbar-user" ref={ref}>
      <button
        type="button"
        className={`topbar-avatar${inverted ? " topbar-avatar--inverted" : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        aria-label="Account menu"
        onClick={() => setOpen((o) => !o)}
      >
        {getInitials(user.fullName, user.email)}
      </button>
      {open && (
        <div className="topbar-user-menu" role="menu">
          {areaOptions(user.role, pathname).map((o) => (
            <Link
              key={o.area}
              href={o.href}
              className={`topbar-user-link${o.current ? " is-current" : ""}`}
              role="menuitem"
              aria-current={o.current ? "page" : undefined}
              onClick={() => setOpen(false)}
            >
              {o.label}
            </Link>
          ))}
          <Link href="/profile" className="topbar-user-link" role="menuitem" onClick={() => setOpen(false)}>
            Profile
          </Link>
          <button
            type="button"
            className="topbar-user-link topbar-user-signout"
            role="menuitem"
            disabled={isSigningOut}
            onClick={() => startSignOut(async () => { await signOut(); })}
          >
            {isSigningOut ? "Signing out..." : "Sign out"}
          </button>
        </div>
      )}
    </div>
  );
}

type NavChild = {
  label: string;
  to: string;
  desc: string;
  highlight?: boolean;
};

type NavItem = {
  label: string;
  to?: string;
  children?: NavChild[];
};

const NAV: NavItem[] = [
  {
    label: "Leadership",
    children: [
      { label: "Path of Leadership", to: "/path-of-leadership", desc: "An 8-step journey from member to global leader" },
      { label: `${CHAPTER_NAME} Board`, to: "/board-of-directors", desc: "Meet the local leadership team" },
    ],
  },
  {
    label: "Membership",
    children: [
      { label: "About", to: "/about", desc: `What ${CHAPTER_NAME} is, and isn't` },
      { label: "Member Directory", to: "/directory", desc: "Search by industry & location" },
      { label: "Join EO", to: "/join", desc: "Membership criteria & application", highlight: true },
      { label: "Renew Chapter Dues", to: "/chapter-dues", desc: "2026/2027 local chapter dues renewal" },
      { label: "Partners", to: "/partners", desc: "Strategic alliances" },
    ],
  },
  {
    label: "Learning",
    children: [
      { label: "Leadership Training", to: "/training", desc: "EMP, KEY Executive, Path of Leadership" },
      { label: "Member Events", to: "/events", desc: "Forum, learning, signature events" },
      { label: "Global Events", to: "/global-events", desc: "EO regional & worldwide calendar" },
      { label: "Community Events", to: "/community-events", desc: "Open to non-members" },
      { label: "Blog", to: "/blog", desc: "Stories & playbooks from members" },
      { label: "Forum", to: "/forum", desc: "The 8 peers who change everything" },
      { label: "Past Events", to: "/past-events", desc: "Recordings & recaps" },
    ],
  },
  { label: "Podcast", to: "/podcast" },
];

// Routes that have a dark hero — the topbar is transparent over them on initial load.
const DARK_HERO_ROUTES = new Set([
  "/",
  "/about",
  "/path-of-leadership",
  "/events",
  "/global-events",
  "/board-of-directors",
  "/community-events",
  "/past-events",
]);

export function Topbar({ user }: { user?: TopbarUser | null }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin") ?? false;
  const [scrolled, setScrolled] = useState(false);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setOpenMenu(null);
        setMobileOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Lock background scroll while the full-screen mobile menu is open, so the
  // page behind the overlay doesn't scroll under your finger on iOS.
  useEffect(() => {
    if (!mobileOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [mobileOpen]);

  // Event detail pages (/events/<slug>, incl. the static landing pages) all
  // render a dark hero, so the topbar must invert to the white logo over them.
  // Deeper subpages (/events/<slug>/survey, /thank-you) are light and excluded.
  // RISE 4 is the exception: its hero is light, so it keeps the dark logo.
  const isEventDetail =
    /^\/events\/[^/]+$/.test(pathname ?? "") && pathname !== "/events/eo-rise-4";
  const onDarkHero =
    (DARK_HERO_ROUTES.has(pathname) || isEventDetail) && !scrolled;
  const inverted = onDarkHero;

  return (
    <header
      className={`topbar ${scrolled ? "is-scrolled" : ""} ${onDarkHero ? "on-dark" : ""}`.trim()}
    >
      <div className="topbar-inner">
        <Link href="/" className="topbar-brand">
          <Logo inverted={inverted} />
        </Link>

        <nav className="topbar-nav" onMouseLeave={() => setOpenMenu(null)}>
          {NAV.map((item) => (
            <div
              key={item.label}
              className={`nav-item ${openMenu === item.label ? "is-open" : ""}`}
              onMouseEnter={() => item.children && setOpenMenu(item.label)}
            >
              {item.children ? (
                <button
                  className="nav-link"
                  aria-expanded={openMenu === item.label}
                  aria-haspopup="true"
                  type="button"
                  onClick={() =>
                    setOpenMenu(openMenu === item.label ? null : item.label)
                  }
                >
                  {item.label}
                  <svg width="10" height="10" viewBox="0 0 10 10">
                    <path d="M2 3.5l3 3 3-3" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
                  </svg>
                </button>
              ) : (
                <Link href={item.to!} className="nav-link" onClick={() => setOpenMenu(null)}>
                  {item.label}
                </Link>
              )}
              {item.children && openMenu === item.label && (
                <div className="mega-menu">
                  <div className="mega-grid">
                    {item.children.map((child) => (
                      <Link
                        key={child.to}
                        href={child.to}
                        className={`mega-link ${child.highlight ? "is-highlight" : ""}`.trim()}
                        onClick={() => setOpenMenu(null)}
                      >
                        <div className="mega-link-label">
                          {child.label}
                          {child.highlight && <span className="mega-badge">Apply</span>}
                        </div>
                        <div className="mega-link-desc">{child.desc}</div>
                      </Link>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </nav>

        <div className="topbar-actions">
          {!isAdmin && (
            user ? (
              <TopbarAvatar user={user} inverted={inverted} />
            ) : (
              <Link
                href="/login"
                className={`topbar-auth-link ${inverted ? "topbar-auth-link--inverted" : ""}`}
              >
                Sign in
              </Link>
            )
          )}
          <Link href="/join" className="btn btn--primary btn--sm">
            Join EO
          </Link>
          <button
            className="topbar-burger"
            onClick={() => setMobileOpen(true)}
            aria-label="Open menu"
            type="button"
          >
            <span></span>
            <span></span>
            <span></span>
          </button>
        </div>
      </div>

      {mobileOpen && <MobileNav onClose={() => setMobileOpen(false)} user={user} />}
    </header>
  );
}

function MobileNav({ onClose, user }: { onClose: () => void; user?: TopbarUser | null }) {
  const [openSection, setOpenSection] = useState<string | null>(null);
  const [isSigningOut, startSignOut] = useTransition();
  const pathname = usePathname() ?? "/";
  return (
    <div className="mobile-nav">
      <div className="mobile-nav-top">
        <Logo />
        <button className="mobile-nav-close" onClick={onClose} aria-label="Close menu" type="button">
          ✕
        </button>
      </div>
      <div className="mobile-nav-body">
        {NAV.map((item) => (
          <div key={item.label} className="mobile-nav-section">
            {item.children ? (
              <>
                <button
                  className="mobile-nav-section-head"
                  onClick={() => setOpenSection(openSection === item.label ? null : item.label)}
                  type="button"
                >
                  <span>{item.label}</span>
                  <span style={{ transform: openSection === item.label ? "rotate(180deg)" : "none", transition: "transform 200ms" }}>
                    ▾
                  </span>
                </button>
                {openSection === item.label && (
                  <div className="mobile-nav-children">
                    {item.children.map((c) => (
                      <Link key={c.to} href={c.to} className="mobile-nav-child" onClick={onClose}>
                        {c.label}
                      </Link>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <Link href={item.to!} className="mobile-nav-section-head" onClick={onClose}>
                {item.label}
              </Link>
            )}
          </div>
        ))}
        <Link href="/join" className="btn btn--primary btn--lg" style={{ width: "100%", marginTop: 24 }} onClick={onClose}>
          Join EO
        </Link>
        {user ? (
          <>
            {areaOptions(user.role, pathname)
              .filter((o) => !o.current)
              .map((o) => (
                <Link key={o.area} href={o.href} className="btn btn--ghost btn--lg" style={{ width: "100%", marginTop: 8 }} onClick={onClose}>
                  {o.label}
                </Link>
              ))}
            <Link href="/profile" className="btn btn--ghost btn--lg" style={{ width: "100%", marginTop: 8 }} onClick={onClose}>
              Profile
            </Link>
            <button
              type="button"
              className="btn btn--ghost btn--lg"
              style={{ width: "100%", marginTop: 8 }}
              disabled={isSigningOut}
              onClick={() => startSignOut(async () => { await signOut(); })}
            >
              {isSigningOut ? "Signing out..." : "Sign out"}
            </button>
          </>
        ) : (
          <Link href="/login" className="btn btn--ghost btn--lg" style={{ width: "100%", marginTop: 8 }} onClick={onClose}>
            Sign in
          </Link>
        )}
      </div>
    </div>
  );
}
