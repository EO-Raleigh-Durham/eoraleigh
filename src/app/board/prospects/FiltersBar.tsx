"use client";

import { fyLabel } from "@/lib/fiscal-year";

type Props = {
  view: "kanban" | "list";
  q: string;
  fy: string; // selected value: an FY start year ("2026") or "all"
  years: number[];
};

// Search + Fiscal year filter bar. No Apply/Clear buttons: changing the
// fiscal year submits immediately, and pressing Enter in the search box
// submits via the hidden button (which also keeps the browser's implicit
// form submission working).

export function FiltersBar({ view, q, fy, years }: Props) {
  return (
    <form method="get" className="funnel-filters">
      <input type="hidden" name="view" value={view} />
      <div className="funnel-filter funnel-filter--grow">
        <label className="funnel-filter-label" htmlFor="f-q">
          Search
        </label>
        <input
          id="f-q"
          name="q"
          type="search"
          defaultValue={q}
          placeholder="Name, email, company, or deal"
        />
      </div>
      <div className="funnel-filter">
        <label className="funnel-filter-label" htmlFor="f-fy">
          Fiscal year
        </label>
        <select
          id="f-fy"
          name="fy"
          defaultValue={fy}
          onChange={(e) => e.currentTarget.form?.requestSubmit()}
        >
          {years.map((y) => (
            <option key={y} value={String(y)}>
              {fyLabel(y)}
            </option>
          ))}
          <option value="all">All years</option>
        </select>
      </div>
      <button type="submit" hidden aria-hidden="true" tabIndex={-1} />
    </form>
  );
}
