import { supabase } from "./supabase";
import { fyStartForDate } from "./fiscal-year";
import { mergeSeatsByPerson, pickBoardYear } from "./board-year";
import { chapterToday } from "../kernel/config/dates";

// Server-only loader for the public board page. Reads the structured board
// model (board_roles / board_appointments / member_photos, see migration 039)
// and returns the current term's chairs, ordered for display.

export type BoardCard = {
  roleKey: string;
  title: string; // display title, e.g. "President" or "Marketing & Communications Chair"
  name: string;
  headline: string | null;
  bio: string | null;
  photoUrl: string | null;
};

export type CurrentBoard = {
  fyLabel: string; // "2026-2027"
  president: BoardCard | null;
  rest: BoardCard[];
};

// President / President-Elect are officers shown by role name; every other
// portfolio's chair is shown as "<Role> Chair".
function displayTitle(roleKey: string, roleName: string): string {
  const isOfficer = roleKey === "president" || roleKey === "president-elect";
  return isOfficer ? roleName : `${roleName} Chair`;
}

export async function getCurrentBoard(): Promise<CurrentBoard | null> {
  const { data: fyRows } = await supabase
    .from("board_appointments")
    .select("fiscal_year_start")
    .eq("position", "Chair");

  const years = [...new Set((fyRows ?? []).map((r) => r.fiscal_year_start as number))];
  const fy = pickBoardYear(years, fyStartForDate(chapterToday()));
  if (fy == null) return null;

  // Chairs for that term, with role + person + photos embedded.
  const { data, error } = await supabase
    .from("board_appointments")
    .select(
      `position,
       board_roles!inner ( key, name, short_name, sort_order ),
       people!inner ( id, name, preferred_name, headline, bio, member_photos ( url, is_primary, sort_order ) )`,
    )
    .eq("fiscal_year_start", fy)
    .eq("position", "Chair");

  if (error || !data) return null;

  type Person = {
    id: string;
    name: string;
    preferred_name: string | null;
    headline: string | null;
    bio: string | null;
    member_photos: { url: string; is_primary: boolean; sort_order: number }[] | null;
  };
  type Row = {
    board_roles: { key: string; name: string; sort_order: number } | null;
    people: Person | null;
  };

  const rows = (data as unknown as Row[]).filter((r) => r.board_roles && r.people);
  const people = new Map(rows.map((r) => [r.people!.id, r.people!]));

  // One card per person; someone in two seats shows both titles on one card.
  const cards: BoardCard[] = mergeSeatsByPerson(
    rows.map((r) => ({
      personId: r.people!.id,
      roleKey: r.board_roles!.key,
      title: displayTitle(r.board_roles!.key, r.board_roles!.name),
      sortOrder: r.board_roles!.sort_order ?? 0,
    })),
  ).map((seat) => {
    const person = people.get(seat.personId)!;
    const photos = person.member_photos ?? [];
    const primary = photos.find((p) => p.is_primary) ?? photos[0] ?? null;
    return {
      roleKey: seat.roleKeys.includes("president") ? "president" : seat.roleKeys[0],
      title: seat.title,
      name: person.preferred_name ?? person.name,
      headline: person.headline,
      bio: person.bio,
      photoUrl: primary?.url ?? null,
    };
  });

  const president = cards.find((c) => c.roleKey === "president") ?? cards[0] ?? null;
  const rest = cards.filter((c) => c !== president);

  return {
    fyLabel: `${fy}-${fy + 1}`,
    president,
    rest,
  };
}
