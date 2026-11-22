import { fyLabel } from "@/lib/fiscal-year";

// Reusable fiscal-year picker used across the board dashboards and reports.
// Renders a plain GET form that reloads the page with ?fy=<year>, so it needs
// no client JS: the browser submits natively. Server component.
export default function FiscalYearSelect({
  options,
  selected,
  label = "Fiscal year",
  paramName = "fy",
}: {
  options: number[];
  selected: number;
  label?: string;
  paramName?: string;
}) {
  return (
    <form className="fysel" method="get">
      <label className="fysel-label" htmlFor={paramName}>
        {label}
      </label>
      <select
        id={paramName}
        name={paramName}
        defaultValue={String(selected)}
        className="fysel-select"
      >
        {options.map((y) => (
          <option key={y} value={y}>
            {fyLabel(y)}
          </option>
        ))}
      </select>
      <button type="submit" className="admin-btn admin-btn--primary">
        View
      </button>
    </form>
  );
}
