// Pure helpers for the Google guest-list sync (no server-only imports so
// node:test can load them).

export type GuestRow = {
  name: string;
  companyRole: string;
  email: string;
  memberType: string;
};

export function companyRole(company: string | null, title: string | null): string {
  const c = (company ?? "").trim();
  const t = (title ?? "").trim();
  if (c && t) return `${c} - ${t}`;
  return c || t;
}

// A spreadsheet cell starting with = + - @ is read as a formula. Registrant
// input is untrusted, so neutralise those leading characters.
export function safeCell(value: string): string {
  const v = value.trim();
  return /^[=+\-@]/.test(v) ? `'${v}` : v;
}

// Sanitised payload rows; drops blank and repeated emails within one registration.
export function toPayloadRows(guests: GuestRow[]): GuestRow[] {
  const seen = new Set<string>();
  const rows: GuestRow[] = [];
  for (const g of guests) {
    const key = g.email.trim().toLowerCase();
    if (!key || seen.has(key)) continue;
    seen.add(key);
    rows.push({
      name: safeCell(g.name),
      companyRole: safeCell(g.companyRole),
      email: safeCell(g.email),
      memberType: safeCell(g.memberType),
    });
  }
  return rows;
}
