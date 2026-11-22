"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Reveal } from "@/components/Reveal";
import {
  EVENT_TYPE_ORDER,
  eventTypeLabel,
  formatEventDate,
  formatEventDateFor,
  type EventRow,
  type EventType,
} from "@/lib/events";
import { hasStaticRecap } from "@/content/event-recaps";

type Props = {
  events: EventRow[];
  // When true, append the year ("DEC 2024") to the row's month label.
  // Used by the /past-events archive.
  showYearInRow?: boolean;
  // When true, render a year filter (derived from the events list).
  // Used by the /past-events archive.
  showYearFilter?: boolean;
  // When true, show whether each event has a published recap or not.
  // Used by the /past-events archive (recaps don't apply to upcoming events).
  showRecapStatus?: boolean;
  // Override copy for the empty state.
  emptyMessage?: string;
};

const ALL_TYPES = "All" as const;
type TypeFilter = typeof ALL_TYPES | EventType;

const ALL_YEARS = "All years" as const;

export function EventsList({
  events,
  showYearInRow = false,
  showYearFilter = false,
  showRecapStatus = false,
  emptyMessage = "No events in this category right now. Check back soon.",
}: Props) {
  const [typeFilter, setTypeFilter] = useState<TypeFilter>(ALL_TYPES);
  const [yearFilter, setYearFilter] = useState<string>(ALL_YEARS);

  const years = useMemo(() => {
    if (!showYearFilter) return [];
    const set = new Set<string>();
    for (const e of events) {
      set.add(formatEventDate(e.starts_at, e.ends_at).year);
    }
    return Array.from(set).sort((a, b) => Number(b) - Number(a));
  }, [events, showYearFilter]);

  const filtered = useMemo(() => {
    return events.filter((e) => {
      if (typeFilter !== ALL_TYPES && e.type !== typeFilter) return false;
      if (showYearFilter && yearFilter !== ALL_YEARS) {
        const { year } = formatEventDate(e.starts_at, e.ends_at);
        if (year !== yearFilter) return false;
      }
      return true;
    });
  }, [events, typeFilter, yearFilter, showYearFilter]);

  return (
    <>
      <div className="events-filter">
        {showYearFilter && (
          <>
            <button
              type="button"
              className={`events-filter-pill ${
                yearFilter === ALL_YEARS ? "is-active" : ""
              }`.trim()}
              onClick={() => setYearFilter(ALL_YEARS)}
            >
              {ALL_YEARS}
            </button>
            {years.map((y) => (
              <button
                key={y}
                type="button"
                className={`events-filter-pill ${
                  yearFilter === y ? "is-active" : ""
                }`.trim()}
                onClick={() => setYearFilter(y)}
              >
                {y}
              </button>
            ))}
            <span style={{ width: 8 }}></span>
          </>
        )}
        <button
          type="button"
          className={`events-filter-pill ${
            typeFilter === ALL_TYPES ? "is-active" : ""
          }`.trim()}
          onClick={() => setTypeFilter(ALL_TYPES)}
        >
          All
        </button>
        {EVENT_TYPE_ORDER.map((t) => (
          <button
            key={t}
            type="button"
            className={`events-filter-pill ${
              typeFilter === t ? "is-active" : ""
            }`.trim()}
            onClick={() => setTypeFilter(t)}
          >
            {eventTypeLabel(t)}
          </button>
        ))}
      </div>

      <div className="events-list" style={{ marginTop: 24 }}>
        {filtered.map((e, i) => {
          const date = formatEventDateFor(e);
          const monthLine = showYearInRow
            ? `${date.monthUpper} ${date.year}`
            : date.monthUpper;
          const cat = `${eventTypeLabel(e.type)}${
            e.tag_label ? ` · ${e.tag_label}` : ""
          }`;
          return (
            <Reveal key={e.id} delay={i * 40}>
              <Link href={`/events/${e.slug ?? e.id}`} className="event-row event-row--link">
                <div className="event-row-date">
                  <div className="event-row-day">{date.day}</div>
                  <div className="event-row-month mono">{monthLine}</div>
                </div>
                <div className="event-row-body">
                  <div className="event-row-cat mono">
                    {cat}
                    {showRecapStatus && (
                      e.recap_published || hasStaticRecap(e.slug) ? (
                        <span style={{ color: "var(--accent)", fontWeight: 600 }}>
                          {" · Recap available"}
                        </span>
                      ) : (
                        <span style={{ color: "var(--text-muted, #6B7280)" }}>
                          {" · No recap yet"}
                        </span>
                      )
                    )}
                  </div>
                  <h3 className="event-row-title">{e.title}</h3>
                  <div className="event-row-meta">
                    {e.speaker && <span>{e.speaker}</span>}
                    {e.speaker && e.location && (
                      <span className="divider"></span>
                    )}
                    {e.location && <span>{e.location}</span>}
                  </div>
                </div>
                <div className="event-row-cta">
                  <span className="event-row-arrow">→</span>
                </div>
              </Link>
            </Reveal>
          );
        })}
      </div>

      {filtered.length === 0 && (
        <div className="events-empty">
          <p className="lead text-muted">{emptyMessage}</p>
        </div>
      )}
    </>
  );
}
