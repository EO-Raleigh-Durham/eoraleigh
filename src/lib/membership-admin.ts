// Board-side membership changes: add a member, change a membership's status.
// Server only (secret client): callers must run requireBoardOrAbove() first.

import { supabase } from "./supabase";
import { CHAPTER_NAME } from "../kernel/config/chapter.ts";
import { resolveSubmissionPersonWithSupabase } from "./submission-person-supabase";
import type { ChapterMembershipStatus, ChapterMembershipType } from "./membership-model";

type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string };

export type MembershipRow = {
  id: string;
  status: string;
  membership_type: string;
  start_date: string | null;
  end_date: string | null;
  updated_at: string | null;
};

async function chapterId(): Promise<string | null> {
  const { data } = await supabase.from("chapters").select("id").eq("chapter_name", CHAPTER_NAME).maybeSingle();
  return (data?.id as string | undefined) ?? null;
}

export async function loadMemberships(personId: string): Promise<MembershipRow[]> {
  const id = await chapterId();
  if (!id) return [];
  const { data } = await supabase
    .from("chapter_memberships")
    .select("id, status, membership_type, start_date, end_date, updated_at")
    .eq("person_id", personId)
    .eq("chapter_id", id)
    .order("start_date", { ascending: false, nullsFirst: false });
  return (data ?? []) as MembershipRow[];
}

export async function getMembership(id: string): Promise<(MembershipRow & { person_id: string }) | null> {
  const { data } = await supabase
    .from("chapter_memberships")
    .select("id, person_id, status, membership_type, start_date, end_date, updated_at")
    .eq("id", id)
    .maybeSingle();
  return (data as (MembershipRow & { person_id: string }) | null) ?? null;
}

/**
 * Adds a member: finds the person by any of their emails (or creates them
 * through the shared identity adapter) and opens a membership. Someone who
 * already has an active or on-leave membership is left unchanged.
 */
export async function addMember(input: {
  name: string;
  email: string;
  type: ChapterMembershipType;
  startDate: string;
}): Promise<Result<{ personId: string; membershipId: string | null; alreadyMember: boolean }>> {
  const id = await chapterId();
  if (!id) return { ok: false, error: `${CHAPTER_NAME} chapter not found.` };

  const person = await resolveSubmissionPersonWithSupabase({ email: input.email, name: input.name });
  if (person.error || !person.data) return { ok: false, error: person.error?.message ?? "Could not save the person." };
  const personId = person.data.id;

  const { data: current } = await supabase
    .from("chapter_memberships")
    .select("id")
    .eq("person_id", personId)
    .eq("chapter_id", id)
    .in("status", ["active", "on_leave"])
    .limit(1)
    .maybeSingle();
  if (current) return { ok: true, value: { personId, membershipId: current.id as string, alreadyMember: true } };

  const { data, error } = await supabase
    .from("chapter_memberships")
    .insert({
      person_id: personId,
      chapter_id: id,
      membership_type: input.type,
      status: "active",
      start_date: input.startDate,
    })
    .select("id")
    .single();
  if (error || !data) return { ok: false, error: error?.message ?? "Could not open the membership." };
  return { ok: true, value: { personId, membershipId: data.id as string, alreadyMember: false } };
}

export async function updateMembershipStatus(
  id: string,
  change: { status: ChapterMembershipStatus; end_date: string | null },
): Promise<Result> {
  const { error } = await supabase.from("chapter_memberships").update(change).eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true, value: undefined };
}
