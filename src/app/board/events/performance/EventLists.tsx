"use client";

import Link from "next/link";
import { useState } from "react";

export type ListEvent = {
  id: string;
  title: string;
  day: string; // "13"
  month: string; // "Nov"
  dateLabel: string; // full date, for the tooltip
  typeLabel: string;
  typeColor: string;
  happeningNow?: boolean;
};

export type PastEvent = ListEvent & {
  registered: number;
  checkedIn: number;
  revenue: string | null; // "$1,200", null = free
  rating: string | null; // "4.6"
  ratingNote: string | null; // "27 ratings" or "old survey"
  surveyEnabled: boolean;
};

const PAGE = 8;

function DateChip({ e }: { e: ListEvent }) {
  return (
    <div className="emx-date" title={e.dateLabel}>
      <span className="emx-date-month">{e.month}</span>
      <span className="emx-date-day">{e.day}</span>
    </div>
  );
}

function TypePill({ e }: { e: ListEvent }) {
  return (
    <span className="emx-type">
      <i style={{ background: e.typeColor }} />
      {e.typeLabel}
    </span>
  );
}

export default function EventLists({
  upcoming,
  past,
}: {
  upcoming: ListEvent[];
  past: PastEvent[];
}) {
  const [tab, setTab] = useState<"upcoming" | "past">(
    upcoming.length > 0 ? "upcoming" : "past",
  );
  const [showAll, setShowAll] = useState(false);
  const rows = tab === "upcoming" ? upcoming : past;
  const visible = showAll ? rows : rows.slice(0, PAGE);

  const pick = (next: "upcoming" | "past") => {
    setTab(next);
    setShowAll(false);
  };

  return (
    <section className="emx-section emx-lists">
      <div className="emx-tabs" role="tablist" aria-label="Events">
        <button
          role="tab"
          aria-selected={tab === "upcoming"}
          className={tab === "upcoming" ? "is-on" : ""}
          onClick={() => pick("upcoming")}
        >
          Upcoming <span>{upcoming.length}</span>
        </button>
        <button
          role="tab"
          aria-selected={tab === "past"}
          className={tab === "past" ? "is-on" : ""}
          onClick={() => pick("past")}
        >
          Past <span>{past.length}</span>
        </button>
      </div>

      <div className="emx-list-card" role="tabpanel">
        {rows.length === 0 ? (
          <div className="emx-list-empty">
            {tab === "upcoming" ? "Nothing scheduled yet this fiscal year." : "No events held yet this fiscal year."}
          </div>
        ) : tab === "upcoming" ? (
          <>
            <div className="emx-list-head">Next up</div>
            <ul className="emx-list">
              {(visible as ListEvent[]).map((e) => (
                <li key={e.id}>
                  <DateChip e={e} />
                  <div className="emx-list-main">
                    <Link href={`/board/events/${e.id}`} className="emx-list-title">
                      {e.title}
                    </Link>
                    <div className="emx-list-meta">
                      <TypePill e={e} />
                      {e.happeningNow && <span className="emx-now">Happening now</span>}
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <ul className="emx-list">
            {(visible as PastEvent[]).map((e) => (
              <li key={e.id}>
                <DateChip e={e} />
                <div className="emx-list-main">
                  <Link href={`/board/events/${e.id}`} className="emx-list-title">
                    {e.title}
                  </Link>
                  <div className="emx-list-meta">
                    <TypePill e={e} />
                  </div>
                </div>
                <dl className="emx-list-nums">
                  <div>
                    <dt>Registered</dt>
                    <dd>{e.registered}</dd>
                  </div>
                  <div>
                    <dt>Checked in</dt>
                    <dd>{e.checkedIn}</dd>
                  </div>
                  <div>
                    <dt>Revenue</dt>
                    <dd>{e.revenue ?? "Free"}</dd>
                  </div>
                  <div>
                    <dt>Rating</dt>
                    <dd>
                      {e.rating ? (
                        <>
                          {e.rating}
                          <small> {e.ratingNote}</small>
                        </>
                      ) : e.surveyEnabled ? (
                        <span className="emx-unrated">No ratings</span>
                      ) : (
                        "—"
                      )}
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}

        {rows.length > PAGE && (
          <button className="emx-list-more" onClick={() => setShowAll(!showAll)}>
            {showAll ? "Show fewer" : `Show all ${rows.length}`}
          </button>
        )}
      </div>
    </section>
  );
}
