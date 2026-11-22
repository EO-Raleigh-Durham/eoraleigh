import { CHAPTER_NAME } from "../kernel/config/chapter.ts";
import "server-only";

import { requireBoardOrAbove } from "./auth";
import {
  countGlobalEventParticipation,
  isGlobalParticipationSchemaUnavailableCode,
  type GlobalEventParticipationStatus,
} from "./global-event-participation-policy";
import { supabase } from "./supabase";

export type { GlobalEventParticipationStatus } from "./global-event-participation-policy";

export type GlobalEventParticipant = {
  id: string;
  eventId: string;
  personId: string;
  name: string;
  status: GlobalEventParticipationStatus;
  createdAt: string;
  updatedAt: string;
  createdByName: string | null;
  updatedByName: string | null;
};

export type GlobalEventParticipationCandidate = {
  personId: string;
  name: string;
  membershipStatus: "active" | "on_leave";
  membershipType: "Primary Membership" | "Secondary Membership";
  trackedStatus: GlobalEventParticipationStatus | null;
};

export type GlobalEventParticipationCounts = {
  going: number;
  attended: number;
  total: number;
};

export type GlobalEventParticipationPageDataResult =
  | {
      available: true;
      participants: GlobalEventParticipant[];
      candidates: GlobalEventParticipationCandidate[];
      counts: GlobalEventParticipationCounts;
    }
  | { available: false; reason: "schema_unavailable" };

type DatabaseError = { code?: string | null } | null;

export function isGlobalParticipationSchemaUnavailable(error: DatabaseError): boolean {
  return isGlobalParticipationSchemaUnavailableCode(error?.code);
}

function safeReadFailure(operation: string, error: DatabaseError): never {
  console.error(`${operation} failed`, { code: error?.code ?? "unknown" });
  throw new Error("Global event participation could not be loaded");
}

type ParticipationRow = {
  id: string;
  event_id: string;
  person_id: string;
  status: GlobalEventParticipationStatus;
  created_by_profile_id: string | null;
  updated_by_profile_id: string | null;
  created_at: string;
  updated_at: string;
};

type DisplayPerson = {
  id: string;
  name: string | null;
  first_name: string | null;
  last_name: string | null;
  preferred_name: string | null;
};

function displayName(person: DisplayPerson): string {
  return (
    person.preferred_name ||
    [person.first_name, person.last_name].filter(Boolean).join(" ") ||
    person.name ||
    `${CHAPTER_NAME} member`
  );
}

async function loadActiveRows(eventId: string): Promise<
  | { available: true; rows: ParticipationRow[] }
  | { available: false; reason: "schema_unavailable" }
> {
  const { data, error } = await supabase
    .from("global_event_participation")
    .select(
      "id, event_id, person_id, status, created_by_profile_id, updated_by_profile_id, created_at, updated_at",
    )
    .eq("event_id", eventId)
    .is("removed_at", null)
    .order("created_at", { ascending: true });

  if (isGlobalParticipationSchemaUnavailable(error)) {
    return { available: false, reason: "schema_unavailable" };
  }
  if (error) safeReadFailure("global participation read", error);
  return { available: true, rows: (data ?? []) as ParticipationRow[] };
}

async function loadParticipantDetails(
  rows: ParticipationRow[],
): Promise<GlobalEventParticipant[]> {
  const personIds = [...new Set(rows.map((row) => row.person_id))];
  const profileIds = [
    ...new Set(
      rows
        .flatMap((row) => [row.created_by_profile_id, row.updated_by_profile_id])
        .filter((id): id is string => Boolean(id)),
    ),
  ];

  const [peopleResult, profilesResult] = await Promise.all([
    personIds.length
      ? supabase
          .from("people")
          .select("id, name, first_name, last_name, preferred_name")
          .in("id", personIds)
      : Promise.resolve({ data: [], error: null }),
    profileIds.length
      ? supabase.from("user_profiles").select("id, full_name").in("id", profileIds)
      : Promise.resolve({ data: [], error: null }),
  ]);
  if (peopleResult.error) safeReadFailure("global participation people read", peopleResult.error);
  if (profilesResult.error) {
    safeReadFailure("global participation audit read", profilesResult.error);
  }

  const peopleById = new Map(
    ((peopleResult.data ?? []) as DisplayPerson[]).map((person) => [person.id, person]),
  );
  const profileNames = new Map(
    ((profilesResult.data ?? []) as { id: string; full_name: string | null }[]).map(
      (profile) => [profile.id, profile.full_name],
    ),
  );
  return rows.map((row) => ({
    id: row.id,
    eventId: row.event_id,
    personId: row.person_id,
    name: peopleById.has(row.person_id)
      ? displayName(peopleById.get(row.person_id)!)
      : `${CHAPTER_NAME} member`,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    createdByName: row.created_by_profile_id
      ? profileNames.get(row.created_by_profile_id) ?? null
      : null,
    updatedByName: row.updated_by_profile_id
      ? profileNames.get(row.updated_by_profile_id) ?? null
      : null,
  }));

}

async function loadCandidates(
  rows: ParticipationRow[],
): Promise<GlobalEventParticipationCandidate[]> {
  const { data: chapter, error: chapterError } = await supabase
    .from("chapters")
    .select("id")
    .eq("chapter_name", CHAPTER_NAME)
    .maybeSingle();
  if (chapterError) safeReadFailure("global participation chapter read", chapterError);
  if (!chapter) return [];

  const { data, error } = await supabase
    .from("chapter_memberships")
    .select(
      "status, membership_type, person:people!chapter_memberships_person_id_fkey(id, name, first_name, last_name, preferred_name)",
    )
    .eq("chapter_id", chapter.id)
    .in("status", ["active", "on_leave"])
    .in("membership_type", ["Primary Membership", "Secondary Membership"]);
  if (error) safeReadFailure("global participation candidate read", error);

  const trackedByPerson = new Map(
    rows.map((row) => [row.person_id, row.status] as const),
  );
  const candidatesByPerson = new Map<string, GlobalEventParticipationCandidate>();
  for (const row of data ?? []) {
    const person = row.person as unknown as DisplayPerson | null;
    if (!person) continue;
    candidatesByPerson.set(person.id, {
      personId: person.id,
      name: displayName(person),
      membershipStatus: row.status as "active" | "on_leave",
      membershipType: row.membership_type as
        | "Primary Membership"
        | "Secondary Membership",
      trackedStatus: trackedByPerson.get(person.id) ?? null,
    });
  }
  const candidates = [...candidatesByPerson.values()];
  candidates.sort((a, b) => a.name.localeCompare(b.name));
  return candidates;
}

export async function getGlobalEventParticipationPageData(
  eventId: string,
): Promise<GlobalEventParticipationPageDataResult> {
  await requireBoardOrAbove();

  const active = await loadActiveRows(eventId);
  if (!active.available) return active;
  const [participants, candidates] = await Promise.all([
    loadParticipantDetails(active.rows),
    loadCandidates(active.rows),
  ]);
  return {
    available: true,
    participants,
    candidates,
    counts: countGlobalEventParticipation(participants),
  };
}
