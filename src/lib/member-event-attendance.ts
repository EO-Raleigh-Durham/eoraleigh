import { supabase } from "./supabase.ts";

export type AttendanceSource = "registration" | "global_cohort";

export type MemberEventAttendance = {
  event_id: string;
  person_id: string;
  attended_at: string;
  attendance_source: AttendanceSource;
  event_title: string;
  event_starts_at: string;
  event_status: string;
  event_type: string;
  event_scope: string;
};

export type MemberEventAttendanceFilters = {
  personIds?: string[];
  eventIds?: string[];
  eventStartsFrom?: string;
  eventStartsBefore?: string;
};

type QueryError = { code?: string; message: string };
type QueryResult = { data: unknown[] | null; error: QueryError | null };

type AttendanceQuery = PromiseLike<QueryResult> & {
  select(value: string): AttendanceQuery;
  eq(column: string, value: unknown): AttendanceQuery;
  in(column: string, values: unknown[]): AttendanceQuery;
  neq(column: string, value: unknown): AttendanceQuery;
  not(column: string, operator: string, value: unknown): AttendanceQuery;
  or(value: string): AttendanceQuery;
  gte(column: string, value: unknown): AttendanceQuery;
  lt(column: string, value: unknown): AttendanceQuery;
};

export type MemberEventAttendanceClient = {
  from(table: string): AttendanceQuery;
};

const MISSING_ATTENDANCE_VIEW_CODES = new Set(["42P01", "PGRST205"]);

export function isMissingMemberAttendanceViewError(
  error: { code?: string; message?: string } | null | undefined,
): boolean {
  return !!error?.code && MISSING_ATTENDANCE_VIEW_CODES.has(error.code);
}

function queryError(context: string, error: QueryError): Error {
  return Object.assign(new Error(`${context}: ${error.message}`), {
    code: error.code,
  });
}

function applyFilters(
  query: AttendanceQuery,
  filters: MemberEventAttendanceFilters,
  eventStartsColumn: string,
): AttendanceQuery {
  let filtered = query;
  if (filters.personIds?.length === 1) {
    filtered = filtered.eq("person_id", filters.personIds[0]);
  } else if (filters.personIds?.length) {
    filtered = filtered.in("person_id", filters.personIds);
  }
  if (filters.eventIds?.length === 1) {
    filtered = filtered.eq("event_id", filters.eventIds[0]);
  } else if (filters.eventIds?.length) {
    filtered = filtered.in("event_id", filters.eventIds);
  }
  if (filters.eventStartsFrom) {
    filtered = filtered.gte(eventStartsColumn, filters.eventStartsFrom);
  }
  if (filters.eventStartsBefore) {
    filtered = filtered.lt(eventStartsColumn, filters.eventStartsBefore);
  }
  return filtered;
}

async function loadRegistrationAttendanceFallback(
  filters: MemberEventAttendanceFilters,
  client: MemberEventAttendanceClient,
): Promise<MemberEventAttendance[]> {
  const query = applyFilters(
    client
      .from("event_registrations")
      .select(
        "event_id, person_id, checked_in_at, events!inner(title, starts_at, status, type, scope)",
      )
      .neq("review_classification", "spam")
      .not("person_id", "is", null)
      .or("status.eq.attended,checked_in_at.not.is.null"),
    filters,
    "events.starts_at",
  );
  const { data, error } = await query;
  if (error) throw queryError("Registration attendance fallback failed", error);

  return (data ?? []).flatMap((value) => {
    const row = value as {
      event_id: string;
      person_id: string | null;
      checked_in_at: string | null;
      events:
        | {
            title: string;
            starts_at: string;
            status: string;
            type: string;
            scope: string;
          }
        | Array<{
            title: string;
            starts_at: string;
            status: string;
            type: string;
            scope: string;
          }>
        | null;
    };
    const event = Array.isArray(row.events) ? row.events[0] : row.events;
    if (!row.person_id || !event) return [];
    return [{
      event_id: row.event_id,
      person_id: row.person_id,
      attended_at: row.checked_in_at ?? event.starts_at,
      attendance_source: "registration" as const,
      event_title: event.title,
      event_starts_at: event.starts_at,
      event_status: event.status,
      event_type: event.type,
      event_scope: event.scope,
    }];
  });
}

export async function loadMemberEventAttendance(
  filters: MemberEventAttendanceFilters = {},
  client: MemberEventAttendanceClient = supabase as unknown as MemberEventAttendanceClient,
): Promise<MemberEventAttendance[]> {
  if (filters.personIds?.length === 0 || filters.eventIds?.length === 0) return [];

  const query = applyFilters(
    client
      .from("member_event_attendance")
      .select(
        "event_id, person_id, attended_at, attendance_source, event_title, event_starts_at, event_status, event_type, event_scope",
      ),
    filters,
    "event_starts_at",
  );
  const { data, error } = await query;
  if (!error) return (data ?? []) as MemberEventAttendance[];
  if (!isMissingMemberAttendanceViewError(error)) {
    throw queryError("Member attendance query failed", error);
  }
  return loadRegistrationAttendanceFallback(filters, client);
}
