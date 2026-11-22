// Server-only. Meeting notes on SAP deals and membership prospects
// (supabase/116_deal_notes.sql). Written from the chapter connector today;
// shown on each deal's page.
import { supabase } from "./supabase";

export type DealKind = "sap" | "prospect";

export type DealNote = {
  id: string;
  created_at: string;
  met_on: string;
  title: string | null;
  body: string;
  next_step: string | null;
  source: "web" | "connector";
  author: string | null;
};

type Row = Omit<DealNote, "author"> & { author: { full_name: string | null } | null };

export async function listDealNotes(kind: DealKind, dealId: string, limit = 50): Promise<DealNote[]> {
  const { data, error } = await supabase
    .from("deal_notes")
    .select("id, created_at, met_on, title, body, next_step, source, author:user_profiles(full_name)")
    .eq("deal_kind", kind)
    .eq("deal_id", dealId)
    .order("met_on", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) {
    // The timeline is extra: a missing table (before migration 116) or a
    // failed read must not break the deal page.
    console.warn("listDealNotes:", error.message);
    return [];
  }
  return ((data ?? []) as unknown as Row[]).map(({ author, ...n }) => ({ ...n, author: author?.full_name ?? null }));
}

export async function addDealNote(input: {
  kind: DealKind;
  dealId: string;
  authorProfileId: string;
  metOn: string;
  title: string | null;
  body: string;
  nextStep: string | null;
  source: "web" | "connector";
}): Promise<{ id: string }> {
  const { data, error } = await supabase
    .from("deal_notes")
    .insert({
      deal_kind: input.kind,
      deal_id: input.dealId,
      author_profile_id: input.authorProfileId,
      met_on: input.metOn,
      title: input.title,
      body: input.body,
      next_step: input.nextStep,
      source: input.source,
    })
    .select("id")
    .single();
  if (error) throw new Error(`Could not save the note: ${error.message}`);
  return { id: (data as { id: string }).id };
}
