"use server";

// The chapter app's version of edge8-web's issues actions (EO-owned): On the Radar.
// Anyone on the board raises an item, it is assigned to someone, and it is
// solved, dropped, or becomes a card on the Board workboard.

import { revalidatePath } from "next/cache";
import { companyOs, type CompanyOsUpdate } from "@/kernel/data/supabase";
import { requirePermission } from "@/kernel/identity/access-request";
import { recordAudit } from "@/kernel/audit/audit";
import { type Result } from "@/kernel/data/result";
import { ISSUE_DIAGNOSES, ISSUE_STATUSES } from "@/entities/org";
import { syncIssueCard } from "@/entities/ideas/lib/issue-card";

function refresh() {
  revalidatePath("/board/radar");
  revalidatePath("/board");
}

export async function createIssue(input: {
  title: string;
  diagnosis: string;
  assignee_person_id: string;
  key_result_id?: string;
  notes_md?: string;
}): Promise<Result & { id?: string }> {
  const { user: admin } = await requirePermission("ideas.manage");
  const title = input.title?.trim();
  if (!title) return { ok: false, error: "Say what the issue is." };
  if (!ISSUE_DIAGNOSES.includes(input.diagnosis as (typeof ISSUE_DIAGNOSES)[number])) {
    return { ok: false, error: "Diagnose it first: goal problem, system problem, or execution problem." };
  }
  if (!input.assignee_person_id) return { ok: false, error: "Assign it to a person." };

  const row = {
    title,
    diagnosis: input.diagnosis,
    assignee_person_id: input.assignee_person_id,
    key_result_id: input.key_result_id || null,
    notes_md: input.notes_md?.trim() || null,
    filed_by: admin.email,
  };
  const { data, error } = await companyOs.from("issues").insert(row).select("id").single();
  if (error) return { ok: false, error: error.message };
  await recordAudit({ table: "issues", recordId: data.id, operation: "insert", actor: admin.email, newData: row });
  await syncIssueCard(data.id);
  refresh();
  return { ok: true, id: data.id };
}

export async function setIssueStatus(id: string, status: string): Promise<Result> {
  const { user: admin } = await requirePermission("ideas.manage");
  if (!ISSUE_STATUSES.includes(status as (typeof ISSUE_STATUSES)[number])) {
    return { ok: false, error: "Invalid status." };
  }
  const updates: CompanyOsUpdate<"issues"> = { status };
  updates.resolved_at = status === "solved" || status === "dropped" ? new Date().toISOString() : null;

  const { error } = await companyOs.from("issues").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await recordAudit({ table: "issues", recordId: id, operation: "update", actor: admin.email, newData: updates });
  await syncIssueCard(id);
  refresh();
  return { ok: true };
}

// Folds a duplicate into another active issue: the duplicate's notes are added
// to the kept issue's and the duplicate is dropped with a pointer to it.
export async function mergeIssue(fromId: string, intoId: string): Promise<Result> {
  const { user: admin } = await requirePermission("ideas.manage");
  if (!fromId || !intoId || fromId === intoId) return { ok: false, error: "Pick another item to merge into." };
  const { data: rows, error } = await companyOs
    .from("issues")
    .select("id, title, notes_md, status, filed_by, created_at")
    .in("id", [fromId, intoId]);
  if (error) return { ok: false, error: error.message };
  const from = rows?.find((r) => r.id === fromId);
  const into = rows?.find((r) => r.id === intoId);
  if (!from || !into) return { ok: false, error: "One of those items no longer exists." };
  if (into.status === "solved" || into.status === "dropped") return { ok: false, error: "Merge into an item that is still open." };

  const merged = [into.notes_md ?? "", `Merged from "${from.title}" (raised by ${from.filed_by}, ${from.created_at.slice(0, 10)})${from.notes_md ? `: ${from.notes_md}` : ""}`]
    .filter(Boolean)
    .join("\n\n");
  const intoUpdate = { notes_md: merged };
  const fromUpdate = {
    status: "dropped",
    resolved_at: new Date().toISOString(),
    notes_md: [from.notes_md ?? "", `Merged into: ${into.title}`].filter(Boolean).join("\n\n"),
  };
  const a = await companyOs.from("issues").update(intoUpdate).eq("id", intoId);
  if (a.error) return { ok: false, error: a.error.message };
  const b = await companyOs.from("issues").update(fromUpdate).eq("id", fromId);
  if (b.error) return { ok: false, error: b.error.message };
  await recordAudit({ table: "issues", recordId: intoId, operation: "update", actor: admin.email, newData: { merged_from: fromId } });
  await recordAudit({ table: "issues", recordId: fromId, operation: "update", actor: admin.email, newData: fromUpdate });
  await syncIssueCard(fromId);
  refresh();
  return { ok: true };
}

export async function setIssueAssignee(id: string, personId: string): Promise<Result> {
  const { user: admin } = await requirePermission("ideas.manage");
  if (!personId) return { ok: false, error: "Assign it to a person." };
  // The picker only offers team members, but the action is the boundary: an
  // id that is not an active team member's person is refused here, not stored.
  const { data: member, error: memberErr } = await companyOs
    .from("team_members")
    .select("id")
    .eq("person_id", personId)
    .eq("status", "active")
    .maybeSingle();
  if (memberErr) return { ok: false, error: memberErr.message };
  if (!member) return { ok: false, error: "That person is not on the board roster." };
  const updates = { assignee_person_id: personId };
  const { error } = await companyOs.from("issues").update(updates).eq("id", id);
  if (error) return { ok: false, error: error.message };
  await recordAudit({ table: "issues", recordId: id, operation: "update", actor: admin.email, newData: updates });
  await syncIssueCard(id);
  refresh();
  return { ok: true };
}
