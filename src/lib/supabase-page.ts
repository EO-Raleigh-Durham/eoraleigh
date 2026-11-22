// src/lib/supabase-page.ts
// PostgREST caps a single response at db_max_rows (default 1000) regardless of
// the client. Any aggregation that counts or sums rows must page past that cap
// or it silently under-reports. fetchAllRows pages with .range() until a short
// page signals the end. Pass a query factory so each page is a fresh request,
// and include a stable .order() in the factory so rows do not shift between pages.

type Page<T> = { data: T[] | null; error: { message: string } | null };

const MAX_PAGES = 100; // 100k-row safety ceiling against a runaway loop

export async function fetchAllRows<T>(
  makePage: (from: number, to: number) => PromiseLike<Page<T>>,
  pageSize = 1000,
): Promise<T[]> {
  const all: T[] = [];
  for (let page = 0; page < MAX_PAGES; page++) {
    const from = page * pageSize;
    const { data, error } = await makePage(from, from + pageSize - 1);
    if (error) throw new Error(error.message);
    const rows = data ?? [];
    all.push(...rows);
    if (rows.length < pageSize) return all;
  }
  console.warn(
    `fetchAllRows: hit ${MAX_PAGES}-page ceiling (${all.length} rows); results may be truncated`,
  );
  return all;
}
