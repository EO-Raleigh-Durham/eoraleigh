import { supabase } from "./supabase";

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
  // Latest term on record (the current/incoming board).
  const { data: fyRows } = await supabase
    .from("board_appointments")
    .select("fiscal_year_start")
    .order("fiscal_year_start", { ascending: false })
    .limit(1);

  const fy = fyRows?.[0]?.fiscal_year_start as number | undefined;
  if (fy == null) return null;

  // Chairs for that term, with role + person + photos embedded.
  const { data, error } = await supabase
    .from("board_appointments")
    .select(
      `position,
       board_roles!inner ( key, name, short_name, sort_order ),
       people!inner ( name, preferred_name, headline, bio, member_photos ( url, is_primary, sort_order ) )`,
    )
    .eq("fiscal_year_start", fy)
    .eq("position", "Chair");

  if (error || !data) return null;

  type Row = {
    board_roles: { key: string; name: string; sort_order: number } | null;
    people: {
      name: string;
      preferred_name: string | null;
      headline: string | null;
      bio: string | null;
      member_photos: { url: string; is_primary: boolean; sort_order: number }[] | null;
    } | null;
  };

  const cards = (data as unknown as Row[])
    .filter((r) => r.board_roles && r.people)
    .map((r) => {
      const role = r.board_roles!;
      const person = r.people!;
      const photos = person.member_photos ?? [];
      const primary = photos.find((p) => p.is_primary) ?? photos[0] ?? null;
      return {
        roleKey: role.key,
        title: displayTitle(role.key, role.name),
        name: person.preferred_name ?? person.name,
        headline: person.headline,
        bio: person.bio,
        photoUrl: primary?.url ?? null,
        _sort: role.sort_order ?? 0,
      };
    })
    .sort((a, b) => a._sort - b._sort);

  const president = cards.find((c) => c.roleKey === "president") ?? cards[0] ?? null;
  const rest = cards.filter((c) => c !== president).map((card) => {
    const { roleKey, title, name, headline, bio, photoUrl } = card;
    return { roleKey, title, name, headline, bio, photoUrl };
  });

  return {
    fyLabel: `${fy}-${fy + 1}`,
    president: president
      ? {
          roleKey: president.roleKey,
          title: president.title,
          name: president.name,
          headline: president.headline,
          bio: president.bio,
          photoUrl: president.photoUrl,
        }
      : null,
    rest,
  };
}
