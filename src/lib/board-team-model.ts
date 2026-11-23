// Pure helpers for the board team screen (/admin/board-team). No database
// access here, so these can be unit-tested and used by client components.

export const EDITABLE_POSITIONS = ["Chair", "Co-Chair"] as const;
export type EditablePosition = (typeof EDITABLE_POSITIONS)[number];

export type TeamRole = { id: string; key: string; name: string; sortOrder: number };
export type TeamPerson = { id: string; name: string; email: string };
export type TeamAppointment = {
  id: string;
  roleId: string;
  position: string;
  person: TeamPerson;
};

export type RoleRow = {
  role: TeamRole;
  chair: TeamAppointment | null;
  coChairs: TeamAppointment[];
  others: TeamAppointment[];
};

/** One row per active role, in board order, with that year's holders. */
export function groupByRole(roles: TeamRole[], appointments: TeamAppointment[]): RoleRow[] {
  return [...roles]
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name))
    .map((role) => {
      const mine = appointments.filter((a) => a.roleId === role.id);
      const byName = (a: TeamAppointment, b: TeamAppointment) => a.person.name.localeCompare(b.person.name);
      return {
        role,
        chair: mine.find((a) => a.position === "Chair") ?? null,
        coChairs: mine.filter((a) => a.position === "Co-Chair").sort(byName),
        others: mine.filter((a) => a.position !== "Chair" && a.position !== "Co-Chair").sort(byName),
      };
    });
}

/** Roles with nobody in the Chair seat. */
export function rolesWithoutChair(rows: RoleRow[]): string[] {
  return rows.filter((r) => !r.chair).map((r) => r.role.name);
}

export type YearStatus = "past" | "current" | "next" | "future";

/** Where a board year sits against today's fiscal year. */
export function yearStatus(year: number, todayFy: number): YearStatus {
  if (year < todayFy) return "past";
  if (year === todayFy) return "current";
  return year === todayFy + 1 ? "next" : "future";
}

/** "2026/27" */
export function boardYearLabel(year: number): string {
  return `${year}/${String(year + 1).slice(2)}`;
}

/** The years offered in the switcher: every year on record plus this year and next. */
export function switcherYears(recorded: number[], todayFy: number): number[] {
  return [...new Set([...recorded, todayFy, todayFy + 1])].sort((a, b) => b - a);
}

/** Lower-case, trimmed email; null when it is not a plausible address. */
export function normaliseEmail(value: string): string | null {
  const email = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
