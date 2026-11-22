"use server";

// The "+" on The Pulse of the Chapter: puts a suggested follow-up for one
// member on the Member Engagement chair's Workboard (Board workboard, her
// function, To do). She owns engagement; the card is hers to do or drop.
import { revalidatePath } from "next/cache";
import { requireBoardOrAbove } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { currentFyStart } from "@/lib/fiscal-year";

const s = (v: FormDataEntryValue | null) => (typeof v === "string" ? v.trim() : "");

export async function addEngagementCard(fd: FormData): Promise<void> {
  await requireBoardOrAbove();
  const personId = s(fd.get("person_id"));
  const step = s(fd.get("step"));
  const why = s(fd.get("why"));
  if (!personId || !step) throw new Error("Missing member or step.");

  const [{ data: person }, { data: board }, { data: seat }, { data: existing }] = await Promise.all([
    supabase.from("people").select("id, name, preferred_name").eq("id", personId).maybeSingle(),
    supabase.from("boards").select("id, board_columns(id, name), epics(id, name)").eq("slug", "board").maybeSingle(),
    supabase
      .from("board_appointments")
      .select("person_id, board_roles!inner(key)")
      .eq("fiscal_year_start", currentFyStart())
      .eq("board_roles.key", "member-engagement")
      .limit(1),
    supabase
      .from("tasks")
      .select("id")
      .eq("subject_type", "person")
      .eq("subject_id", personId)
      .eq("status", "open")
      .eq("metadata->>source", "engagement")
      .is("archived_at", null)
      .limit(1),
  ]);
  if (!person) throw new Error("That member no longer exists.");
  if (!board) throw new Error("The Board workboard is missing.");
  if ((existing ?? []).length) {
    revalidatePath("/board/the-pulse-of-the-chapter");
    return;
  }
  type B = { id: string; board_columns: { id: string; name: string }[]; epics: { id: string; name: string }[] };
  const b = board as unknown as B;
  const todo = b.board_columns.find((c) => c.name === "To do") ?? b.board_columns[0];
  const epic = b.epics.find((e) => e.name.startsWith("Member Engagement"));
  const owner = ((seat ?? []) as { person_id: string }[])[0]?.person_id ?? null;
  const p = person as { name: string | null; preferred_name: string | null };
  const name = p.preferred_name || p.name || "member";

  const { error } = await supabase.from("tasks").insert({
    title: `${step} (${name})`.slice(0, 200),
    description: `From The Pulse of the Chapter.\n\nWhy: ${why}`,
    status: "open",
    board_id: b.id,
    board_column_id: todo?.id ?? null,
    epic_id: epic?.id ?? null,
    assignee_id: owner,
    priority: "p2",
    subject_type: "person",
    subject_id: personId,
    metadata: { source: "engagement" },
  });
  if (error) throw new Error(error.message);
  revalidatePath("/board/the-pulse-of-the-chapter");
  revalidatePath("/board");
}
