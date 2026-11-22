export const GLOBAL_EVENT_PARTICIPATION_STATUSES = ["going", "attended"] as const;

export type GlobalEventParticipationStatus =
  (typeof GLOBAL_EVENT_PARTICIPATION_STATUSES)[number];

export type ExistingGlobalParticipant = {
  personId: string;
  status: GlobalEventParticipationStatus;
};

export function isGlobalEventParticipationStatus(
  value: unknown,
): value is GlobalEventParticipationStatus {
  return GLOBAL_EVENT_PARTICIPATION_STATUSES.includes(
    value as GlobalEventParticipationStatus,
  );
}

const GLOBAL_PARTICIPATION_SCHEMA_UNAVAILABLE_CODES = new Set([
  "42P01",
  "42703",
  "PGRST204",
  "PGRST205",
]);

export function isGlobalParticipationSchemaUnavailableCode(
  code: unknown,
): boolean {
  return (
    typeof code === "string" &&
    GLOBAL_PARTICIPATION_SCHEMA_UNAVAILABLE_CODES.has(code)
  );
}

export function reconcileGlobalParticipantAdds(
  requestedPersonIds: readonly string[],
  activeRows: readonly ExistingGlobalParticipant[],
  requestedStatus: GlobalEventParticipationStatus,
): {
  toAdd: string[];
  alreadyTracked: ExistingGlobalParticipant[];
} {
  void requestedStatus;
  const existingByPerson = new Map(activeRows.map((row) => [row.personId, row]));
  const alreadyTracked: ExistingGlobalParticipant[] = [];
  const toAdd: string[] = [];

  for (const personId of new Set(requestedPersonIds)) {
    const existing = existingByPerson.get(personId);
    if (existing) alreadyTracked.push(existing);
    else toAdd.push(personId);
  }

  return { toAdd, alreadyTracked };
}

export function canAssignGlobalParticipationStatus(
  status: GlobalEventParticipationStatus,
  eventStartsAt: string,
  now = new Date(),
): boolean {
  if (status === "going") return true;
  const startsAt = new Date(eventStartsAt);
  return Number.isFinite(startsAt.getTime()) && startsAt.getTime() <= now.getTime();
}

export function countGlobalEventParticipation(
  rows: readonly { status: GlobalEventParticipationStatus }[],
  // The optional clock makes the absence of time-based conversion explicit.
  now?: Date,
): { going: number; attended: number; total: number } {
  void now;
  let going = 0;
  let attended = 0;
  for (const row of rows) {
    if (row.status === "going") going += 1;
    else attended += 1;
  }
  return { going, attended, total: going + attended };
}
