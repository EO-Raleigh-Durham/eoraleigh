// The chapter app's version of edge8-web's kernel/identity/may-open.ts (EO-owned).
// Whether a notice's recipient may follow a link in it. Every ported screen
// lives under /board and needs board tier (super admin for board settings), so
// a staff recipient may open any /board link and anything outside it is
// public; a recipient who is not staff opens no /board link.
import { accessOf } from "@/kernel/identity/access-of-person";
import type { Access } from "@/kernel/identity/access-model";
import { personIdForEmail } from "@/kernel/identity/person-by-email";

function internal(href: string): boolean {
  const path = href.replace(/^https?:\/\/[^/]+/, "");
  return path === "/board" || path.startsWith("/board/") || path.startsWith("/admin");
}

/** Whether `access` reaches the page at `href`; nobody (null access) opens no staff page. */
export function mayOpen(access: Pick<Access, "may"> | null, href: string | null | undefined): boolean {
  if (!href) return false;
  if (!internal(href)) return true;
  return Boolean(access?.may("surface.admin"));
}

export async function recipientMayOpen(personId: string): Promise<(href: string | null | undefined) => boolean> {
  const access = await accessOf(personId);
  return (href) => mayOpen(access, href);
}

export async function recipientMayOpenByEmail(email: string | null | undefined): Promise<(href: string | null | undefined) => boolean> {
  const personId = await personIdForEmail(email);
  return personId ? recipientMayOpen(personId) : () => false;
}

export async function emailsWhoMayOpen(emails: readonly string[], hrefs: readonly string[]): Promise<string[]> {
  const kept: string[] = [];
  for (const email of emails) {
    const may = await recipientMayOpenByEmail(email);
    if (hrefs.every((href) => may(href))) kept.push(email);
  }
  return kept;
}
