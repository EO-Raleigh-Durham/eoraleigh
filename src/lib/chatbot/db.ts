// Server-only. Restricted SQL executor for the board chatbot.
//
// All chatbot reads run through a dedicated Postgres role (`chatbot_reader`,
// supabase/071_chatbot.sql) whose grants exclude revenue-sensitive columns and
// tables entirely. Defense in depth, each layer independently sufficient:
//   1. validation below (single SELECT/WITH statement only)
//   2. structural wrap: the query runs as a subquery, so DML cannot escape
//   3. the extended protocol rejects multi-statement strings
//   4. the role's grants + RLS policies make sensitive data and writes
//      impossible at the database layer regardless of the SQL text
//   5. a 5s statement_timeout set with SET LOCAL inside a read-only
//      transaction before the query runs. The timer is armed when the query
//      statement starts, so nothing in the query text (set_config included)
//      can lift it, and the read-only transaction cannot be switched back.
//   6. the result text handed to the model is capped (capRows below)

import postgres from "postgres";

const MAX_ROWS = 200;
const MAX_QUERY_CHARS = 8_000;
const STATEMENT_TIMEOUT_MS = 5_000;
const MAX_CELL_CHARS = 2_000;
const MAX_RESULT_CHARS = 60_000;

// Module-level singleton. CHATBOT_DB_URL points at the Supavisor transaction
// pooler (port 6543) as chatbot_reader; prepare:false is required in
// transaction-pool mode.
let client: ReturnType<typeof postgres> | null = null;

function getClient(): ReturnType<typeof postgres> | null {
  if (client) return client;
  const url = process.env.CHATBOT_DB_URL;
  if (!url) {
    console.warn("chatbot/db: CHATBOT_DB_URL is not set; chatbot reads disabled");
    return null;
  }
  client = postgres(url, { max: 3, prepare: false, idle_timeout: 20 });
  return client;
}

export type QueryResult =
  | {
      ok: true;
      rows: Record<string, unknown>[];
      rowCount: number;
      truncated: boolean;
      /** What was cut, in words for the model; null when nothing was. */
      note: string | null;
    }
  | { ok: false; error: string };

/**
 * Caps how much result text reaches the model: any cell longer than
 * maxCellChars is cut (objects and arrays are measured as JSON), and rows stop
 * being added once the total passes maxTotalChars.
 */
export function capRows(
  rows: Record<string, unknown>[],
  maxCellChars: number = MAX_CELL_CHARS,
  maxTotalChars: number = MAX_RESULT_CHARS,
): { rows: Record<string, unknown>[]; cellsCut: number; rowsDropped: number } {
  const out: Record<string, unknown>[] = [];
  let cellsCut = 0;
  let total = 0;
  for (const row of rows) {
    const capped: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(row)) {
      const text =
        typeof value === "string"
          ? value
          : value !== null && typeof value === "object"
            ? JSON.stringify(value) ?? ""
            : null;
      if (text !== null && text.length > maxCellChars) {
        capped[key] = `${text.slice(0, maxCellChars)}... [cut, ${text.length} chars]`;
        cellsCut++;
      } else {
        capped[key] = value;
      }
    }
    total += JSON.stringify(capped).length;
    if (total > maxTotalChars) break;
    out.push(capped);
  }
  return { rows: out, cellsCut, rowsDropped: rows.length - out.length };
}

export async function runReadOnlyQuery(query: string): Promise<QueryResult> {
  const sql = getClient();
  if (!sql) return { ok: false, error: "Database access is not configured" };

  let q = query.trim();
  if (q.endsWith(";")) q = q.slice(0, -1).trimEnd();

  if (!q) return { ok: false, error: "Empty query" };
  if (q.length > MAX_QUERY_CHARS) {
    return { ok: false, error: `Query too long (max ${MAX_QUERY_CHARS} chars)` };
  }
  if (q.includes(";")) {
    return { ok: false, error: "Only a single statement is allowed (no semicolons)" };
  }
  if (!/^\s*(select|with)\b/i.test(q)) {
    return { ok: false, error: "Only SELECT queries are allowed" };
  }

  try {
    // Wrapping as a subquery means anything that survived validation still
    // cannot be DML, and the row cap is enforced server-side.
    const rows = await sql.begin("read only", async (tx) => {
      await tx.unsafe(`set local statement_timeout = ${STATEMENT_TIMEOUT_MS}`);
      return tx.unsafe(`select * from (\n${q}\n) chatbot_q limit ${MAX_ROWS + 1}`);
    });
    const overRowCap = rows.length > MAX_ROWS;
    const capped = capRows(
      (overRowCap ? rows.slice(0, MAX_ROWS) : [...rows]) as unknown as Record<string, unknown>[],
    );
    const notes: string[] = [];
    if (overRowCap) notes.push(`truncated at ${MAX_ROWS} rows`);
    if (capped.rowsDropped)
      notes.push(
        `result too large: only the first ${capped.rows.length} rows are shown, ` +
          "select fewer columns or add a tighter LIMIT",
      );
    if (capped.cellsCut)
      notes.push(`${capped.cellsCut} long values were cut to ${MAX_CELL_CHARS} characters`);
    return {
      ok: true,
      rows: capped.rows,
      rowCount: capped.rows.length,
      truncated: overRowCap || capped.rowsDropped > 0,
      note: notes.length ? notes.join("; ") : null,
    };
  } catch (err) {
    // Postgres errors go back verbatim: the model self-corrects on
    // "column ... does not exist" / "permission denied for ..." feedback.
    return { ok: false, error: (err as Error).message ?? "Query failed" };
  }
}
