import { roleAtLeast, type UserRole } from "./access.ts";
import { pageTier } from "./access-map.ts";

// The header area switcher, shared by the public Topbar and the internal
// SideNav so it reads the same from every area: Public site, Member, Board,
// Admin. Each option shows only to roles that may open it (members: Public
// site and Member; board adds Board; super_admin adds Admin). Display only:
// the proxy and the require* guards still enforce access.

export type SwitchArea = "public" | "member" | "board" | "admin";

export type AreaOption = {
  area: SwitchArea;
  label: string;
  href: string;
  current: boolean;
};

const AREAS: { area: SwitchArea; label: string; href: string }[] = [
  { area: "public", label: "Public site", href: "/" },
  { area: "member", label: "Member", href: "/member/events" },
  { area: "board", label: "Board", href: "/board/chapter-dashboard" },
  { area: "admin", label: "Admin", href: "/admin/users" },
];

const under = (pathname: string, prefix: string) =>
  pathname === prefix || pathname.startsWith(`${prefix}/`);

// Which switcher area a path belongs to. /board-of-directors is the public
// board page, so it stays "public".
export function areaForPath(pathname: string): SwitchArea {
  if (under(pathname, "/admin")) return "admin";
  if (under(pathname, "/board")) return "board";
  if (under(pathname, "/member") || under(pathname, "/portal")) return "member";
  return "public";
}

// The options this user may switch to: each shown only when the role meets the
// destination's route tier (the same manifest the proxy enforces).
export function areaOptions(
  role: UserRole | null | undefined,
  pathname: string,
): AreaOption[] {
  const here = areaForPath(pathname);
  return AREAS.filter((a) => roleAtLeast(role, pageTier(a.href))).map((a) => ({
    ...a,
    current: a.area === here,
  }));
}
