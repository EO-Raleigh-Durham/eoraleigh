import { CHAPTER_NAME } from "../kernel/config/chapter.ts";
import { supabase } from "./supabase";
import { requireMemberOrAbove } from "./auth";

// Server-only loader for the member-facing directory (/member/directory).
// Sourced from chapter_memberships (the source of truth for who is a member),
// active members only (on_leave excluded per chapter rule). Contact details
// (email/phone) are deliberately NOT returned here: the directory gates contact
// behind a Connect intro-email, so private contact info never reaches the page.

export type DirectoryMember = {
  personId: string;
  name: string;
  headline: string | null; // role / one-line bio
  companyName: string | null;
  industry: string | null;
  city: string | null;
  photoUrl: string | null;
};

type MembershipRow = {
  person: {
    id: string;
    name: string | null;
    preferred_name: string | null;
    headline: string | null;
    city: string | null;
    company_id: string | null;
    member_photos: { url: string; is_primary: boolean; sort_order: number }[] | null;
  } | null;
};

function pickPhoto(
  photos: { url: string; is_primary: boolean; sort_order: number }[] | null,
): string | null {
  if (!photos || photos.length === 0) return null;
  const primary = photos.find((p) => p.is_primary);
  if (primary) return primary.url;
  return [...photos].sort((a, b) => a.sort_order - b.sort_order)[0].url;
}

export async function getMemberDirectory(): Promise<DirectoryMember[]> {
  await requireMemberOrAbove();
  const { data, error } = await supabase
    .from("chapter_memberships")
    .select(
      "status, person:people!chapter_memberships_person_id_fkey(" +
        "id, name, preferred_name, headline, city, company_id, " +
        "member_photos ( url, is_primary, sort_order ))",
    )
    .eq("status", "active");

  if (error) {
    console.warn("getMemberDirectory:", error.message);
    return [];
  }

  const rows = (data ?? []) as unknown as MembershipRow[];
  const members = rows.filter((r) => r.person);

  // Resolve company name + industry in one batched query.
  const companyIds = Array.from(
    new Set(
      members
        .map((r) => r.person!.company_id)
        .filter((id): id is string => !!id),
    ),
  );
  const companyMap = new Map<string, { name: string | null; industry: string | null }>();
  if (companyIds.length > 0) {
    const { data: companies } = await supabase
      .from("companies")
      .select("id, name, industry")
      .in("id", companyIds);
    for (const c of (companies ?? []) as {
      id: string;
      name: string | null;
      industry: string | null;
    }[]) {
      companyMap.set(c.id, { name: c.name, industry: c.industry });
    }
  }

  return members
    .map((r) => {
      const p = r.person!;
      const company = p.company_id ? companyMap.get(p.company_id) ?? null : null;
      return {
        personId: p.id,
        name: p.preferred_name ?? p.name ?? `${CHAPTER_NAME} member`,
        headline: p.headline,
        companyName: company?.name ?? null,
        industry: company?.industry ?? null,
        city: p.city,
        photoUrl: pickPhoto(p.member_photos),
      };
    })
    .sort((a, b) => a.name.localeCompare(b.name));
}

export async function getDirectoryMemberName(
  personId: string,
): Promise<string | null> {
  const { data, error } = await supabase
    .from("people")
    .select("name, preferred_name")
    .eq("id", personId)
    .maybeSingle();
  if (error || !data) return null;
  const row = data as { name: string | null; preferred_name: string | null };
  return row.preferred_name ?? row.name ?? null;
}
