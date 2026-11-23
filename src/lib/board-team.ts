// Board team data for /admin/board-team. Server only: uses the secret client,
// so every caller must run requireSuperAdmin() first (the actions do).
//
// The screen writes the same board_appointments rows the yearly SQL seed files
// used to write. Board access is derived from them in board-access.ts.

import { supabase } from "./supabase";
import { currentBoardTerm, type BoardAccessClient } from "./board-access";
import { currentFyStart } from "./fiscal-year";
import { postgrestLikeLiteral } from "./postgrest-like";
import { resolveSubmissionPersonWithSupabase } from "./submission-person-supabase";
import type { EditablePosition, TeamAppointment, TeamPerson, TeamRole } from "./board-team-model";

type Result<T = undefined> = { ok: true; value: T } | { ok: false; error: string };

type PersonRow = { id: string; name: string | null; email: string | null };

function toPerson(p: PersonRow | null): TeamPerson {
  return { id: p?.id ?? "", name: (p?.name ?? "").trim() || (p?.email ?? "Unnamed"), email: p?.email ?? "" };
}

export async function loadRoles(): Promise<TeamRole[]> {
  const { data, error } = await supabase
    .from("board_roles")
    .select("id, key, name, sort_order")
    .eq("is_active", true);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r) => ({ id: r.id, key: r.key, name: r.name, sortOrder: r.sort_order ?? 0 }));
}

export async function loadAppointments(year: number): Promise<TeamAppointment[]> {
  const { data, error } = await supabase
    .from("board_appointments")
    .select("id, board_role_id, position, people(id, name, email)")
    .eq("fiscal_year_start", year)
    .eq("scope", "Local");
  if (error) throw new Error(error.message);
  return (data ?? []).map((a) => ({
    id: a.id,
    roleId: a.board_role_id,
    position: a.position ?? "",
    person: toPerson(a.people as unknown as PersonRow | null),
  }));
}

export async function recordedYears(): Promise<number[]> {
  const { data } = await supabase.from("board_appointments").select("fiscal_year_start").eq("scope", "Local");
  return [...new Set((data ?? []).map((r) => r.fiscal_year_start as number))];
}

/** The year whose chairs hold board access today, and today's fiscal year. */
export async function boardYearsInForce(): Promise<{ inForce: number | null; todayFy: number }> {
  const todayFy = currentFyStart();
  const inForce = await currentBoardTerm(supabase as unknown as BoardAccessClient, todayFy);
  return { inForce, todayFy };
}

export async function searchPeople(query: string): Promise<TeamPerson[]> {
  const q = query.trim();
  if (q.length < 2) return [];
  const like = `%${postgrestLikeLiteral(q)}%`;
  const { data, error } = await supabase
    .from("people")
    .select("id, name, email")
    .or(`name.ilike.${like},email.ilike.${like}`)
    .order("name")
    .limit(8);
  if (error) return [];
  return (data ?? []).map(toPerson);
}

/**
 * Finds a person by email (including their alternate addresses) or creates
 * one, through the shared identity adapter so no duplicate people appear.
 */
export async function findOrCreatePerson(name: string, email: string): Promise<Result<TeamPerson>> {
  const resolved = await resolveSubmissionPersonWithSupabase({ email, name });
  if (resolved.error || !resolved.data) {
    return { ok: false, error: resolved.error?.message ?? "Could not add the person." };
  }
  const { data } = await supabase.from("people").select("id, name, email").eq("id", resolved.data.id).maybeSingle();
  return { ok: true, value: toPerson(data ?? { id: resolved.data.id, name, email }) };
}

export async function addAppointment(
  year: number,
  roleId: string,
  position: EditablePosition,
  personId: string,
): Promise<Result<{ id: string }>> {
  const { data, error } = await supabase
    .from("board_appointments")
    .insert({ fiscal_year_start: year, board_role_id: roleId, position, person_id: personId, scope: "Local" })
    .select("id")
    .single();
  if (error || !data) {
    if (error?.code === "23505") {
      return {
        ok: false,
        error: position === "Chair"
          ? "That role already has a Chair for this year. Remove the current Chair first."
          : "That person already holds this role for this year.",
      };
    }
    return { ok: false, error: error?.message ?? "Could not save the appointment." };
  }
  return { ok: true, value: { id: data.id } };
}

export async function getAppointment(id: string) {
  const { data } = await supabase
    .from("board_appointments")
    .select("id, fiscal_year_start, board_role_id, position, person_id, scope")
    .eq("id", id)
    .maybeSingle();
  return data;
}

export async function deleteAppointment(id: string): Promise<Result> {
  const { error } = await supabase.from("board_appointments").delete().eq("id", id);
  return error ? { ok: false, error: error.message } : { ok: true, value: undefined };
}

/**
 * Copies one year's Chair and Co-Chair appointments into another year. Roles
 * that already have a Chair in the target year keep it; duplicates are skipped.
 */
export async function copyYear(from: number, to: number): Promise<Result<{ copied: number }>> {
  const [source, target] = await Promise.all([loadAppointments(from), loadAppointments(to)]);
  const chaired = new Set(target.filter((a) => a.position === "Chair").map((a) => a.roleId));
  const held = new Set(target.map((a) => `${a.roleId}:${a.person.id}`));
  const rows = source
    .filter((a) => a.position === "Chair" || a.position === "Co-Chair")
    .filter((a) => !(a.position === "Chair" && chaired.has(a.roleId)))
    .filter((a) => !held.has(`${a.roleId}:${a.person.id}`))
    .map((a) => ({
      fiscal_year_start: to,
      board_role_id: a.roleId,
      position: a.position,
      person_id: a.person.id,
      scope: "Local",
    }));
  if (rows.length === 0) return { ok: true, value: { copied: 0 } };
  const { error } = await supabase.from("board_appointments").insert(rows);
  return error ? { ok: false, error: error.message } : { ok: true, value: { copied: rows.length } };
}
