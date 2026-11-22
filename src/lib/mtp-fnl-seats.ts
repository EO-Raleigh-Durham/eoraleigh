// Seat cap for the Moderator Training Program (MTP) day of the March 2027
// "MTP + FNL" training. The board event has no per-day capacity, and Forum
// Next Level (FNL) has no cap, so MTP seats are counted from the registration
// notes the form writes ("Chapter: X. Training: Y"). Choosing MTP alone or
// both trainings takes an MTP seat.

export const MTP_FNL_EVENT_ID = "a4f48179-f293-4443-ac77-edac65136ac9";
export const MTP_SEAT_LIMIT = 12;

export const MTP_TRAINING_MARKER = "Training: Moderator Training Program (MTP)";

export const MTP_FULL_MESSAGE =
  "Moderator Training Program (MTP) has no seats left. Registration for Forum Next Level (FNL) on 10 March is still open.";

export function isMtpSelection(notes: string | null | undefined): boolean {
  return (notes ?? "").includes(MTP_TRAINING_MARKER);
}

// Seat states that hold a place, same as the event-level capacity rule.
export const HELD_STATUSES = ["registered", "attended", "pending_payment"] as const;

export type MtpCountClient = {
  from: (table: string) => {
    select: (
      columns: string,
      options: { count: "exact"; head: true },
    ) => {
      eq: (column: string, value: string) => {
        in: (column: string, values: readonly string[]) => {
          like: (
            column: string,
            pattern: string,
          ) => PromiseLike<{ count: number | null; error: { message: string } | null }>;
        };
      };
    };
  };
};

// Number of held MTP seats for the event. Returns null if the count fails, so
// callers can fail soft instead of blocking registration on a read error.
export async function countMtpSeats(
  client: MtpCountClient,
  eventId: string = MTP_FNL_EVENT_ID,
): Promise<number | null> {
  const { count, error } = await client
    .from("event_registrations")
    .select("id", { count: "exact", head: true })
    .eq("event_id", eventId)
    .in("status", HELD_STATUSES)
    .like("notes", `%${MTP_TRAINING_MARKER}%`);
  if (error) return null;
  return count ?? 0;
}
