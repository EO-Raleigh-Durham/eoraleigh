"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveForumDate } from "./actions";
import { dayLabel, timeLabel, type ForumMeeting } from "@/lib/forum-dates";
import { fyLabel, fyStartForDate } from "@/lib/fiscal-year";

type MonthRow = {
  month: string;
  label: string;
  meeting: ForumMeeting | null;
  // False for months in a fiscal year this member does not moderate.
  canSet: boolean;
  setBy: string | null;
};

// The moderator's panel: one row per coming month, with one row open at a time
// to set or change its date. Months in a year they do not moderate are shown
// but cannot be changed.
export default function SetDatesPanel({ months, today }: { months: MonthRow[]; today: string }) {
  const router = useRouter();
  const [open, setOpen] = useState<string | null>(null);
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [place, setPlace] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  function edit(row: MonthRow) {
    setOpen(row.month);
    setDate(row.meeting?.meetsOn ?? "");
    setTime(row.meeting?.startTime ?? "");
    setPlace(row.meeting?.place ?? "");
    setError(null);
    setNotice(null);
  }

  async function save(row: MonthRow) {
    setError(null);
    setSaving(true);
    const result = await saveForumDate({ month: row.month, date, time, place });
    setSaving(false);
    if (!result.ok) return setError(result.error);
    setOpen(null);
    setNotice(
      result.emailed > 0
        ? `Saved. Your forum was emailed the ${row.label} date.`
        : `Saved. Your forum can see the ${row.label} date on this page.`,
    );
    router.refresh();
  }

  // The last day of a month: day 0 of the month after.
  const lastDay = (month: string) =>
    new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).toISOString().slice(0, 10);

  return (
    <section className="frm-group">
      <div className="admin-section-title" style={{ marginTop: 0 }}>Set forum dates</div>
      {months.map((row) => (
        <div key={row.month} className="frm-month">
          <span className="frm-month-name">{row.label}</span>
          {open === row.month ? (
            <div className="frm-month-form">
              <div className="admin-field">
                <label className="admin-label" htmlFor={`frm-date-${row.month}`}>Date</label>
                <input
                  id={`frm-date-${row.month}`}
                  type="date"
                  value={date}
                  min={row.month < today ? today : row.month}
                  max={lastDay(row.month)}
                  onChange={(e) => setDate(e.target.value)}
                />
              </div>
              <div className="admin-field">
                <label className="admin-label" htmlFor={`frm-time-${row.month}`}>Start time</label>
                <input id={`frm-time-${row.month}`} type="time" value={time} onChange={(e) => setTime(e.target.value)} />
              </div>
              <div className="admin-field frm-month-wide">
                <label className="admin-label" htmlFor={`frm-place-${row.month}`}>Place (optional)</label>
                <input
                  id={`frm-place-${row.month}`}
                  type="text"
                  value={place}
                  maxLength={200}
                  onChange={(e) => setPlace(e.target.value)}
                />
              </div>
              {error && (
                <div className="admin-banner admin-banner--err frm-month-wide" role="alert" style={{ marginBottom: 0 }}>
                  {error}
                </div>
              )}
              <div className="frm-month-actions frm-month-wide">
                <button type="button" className="admin-btn admin-btn--primary" disabled={saving} onClick={() => save(row)}>
                  {saving ? "Saving" : "Save and tell the forum"}
                </button>
                <button type="button" className="admin-btn admin-btn--ghost" disabled={saving} onClick={() => setOpen(null)}>
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <>
              <span className={`frm-month-when${row.meeting ? "" : " frm-person-meta"}`}>
                {row.meeting
                  ? `${dayLabel(row.meeting.meetsOn)} · ${timeLabel(row.meeting.startTime)}${row.meeting.place ? ` · ${row.meeting.place}` : ""}`
                  : "Not set"}
              </span>
              {row.canSet ? (
                <button type="button" className="admin-btn admin-btn--ghost" onClick={() => edit(row)}>
                  {row.meeting ? "Change" : "Set"}
                </button>
              ) : (
                <span className="frm-person-meta">
                  {row.setBy ? `Set by ${row.setBy}` : `${fyLabel(fyStartForDate(row.month))} moderator not named yet`}
                </span>
              )}
            </>
          )}
        </div>
      ))}
      {notice && (
        <div className="admin-banner admin-banner--ok" role="status" style={{ margin: "12px 0 0" }}>
          {notice}
        </div>
      )}
      <p className="frm-person-meta" style={{ margin: "12px 0 0" }}>
        Saving emails the members of this forum. Other forums and the board do not see these dates.
      </p>
    </section>
  );
}
