"use client";

import { useEffect, useState } from "react";
import type { ActivitySurvey, MemberActivityFy } from "@/lib/member-activity";
import { loadMemberActivity } from "./actions";
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

function formatDate(value: string | null): string {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("en-US", {
    timeZone: CHAPTER_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

// A member's events attended + surveys answered, grouped by fiscal year.
// Self-loading on mount via the loadMemberActivity server action so the
// roster page never ships every member's full survey text. Shared by the
// roster shelf and the member detail page; keyed on personId by callers so
// it remounts (and reloads) when the member changes.
export function MemberActivity({ personId }: { personId: string }) {
  const [activity, setActivity] = useState<MemberActivityFy[] | null>(null);
  const [activeFy, setActiveFy] = useState<number | null>(null);

  useEffect(() => {
    let alive = true;
    loadMemberActivity(personId)
      .then((data) => {
        if (!alive) return;
        setActivity(data);
        setActiveFy(data.length ? data[0].fyStart : null);
      })
      .catch(() => {
        if (alive) setActivity([]);
      });
    return () => {
      alive = false;
    };
  }, [personId]);

  const currentFy = activity?.find((g) => g.fyStart === activeFy) ?? null;

  return (
    <section className="admin-shelf-section">
      <h3 className="admin-shelf-section-title">Activity by fiscal year</h3>
      {activity === null ? (
        <div className="admin-shelf-empty-tab">Loading activity…</div>
      ) : activity.length === 0 ? (
        <div className="admin-shelf-empty-tab">No events or surveys recorded</div>
      ) : (
        <>
          <div className="admin-shelf-tabs">
            {activity.map((g) => (
              <button
                key={g.fyStart}
                type="button"
                className={`admin-shelf-tab ${g.fyStart === activeFy ? "is-active" : ""}`.trim()}
                onClick={() => setActiveFy(g.fyStart)}
              >
                {g.label}
              </button>
            ))}
          </div>
          {currentFy && <FyPanel group={currentFy} />}
        </>
      )}
    </section>
  );
}

// Events attended + surveys answered for one fiscal year.
function FyPanel({ group }: { group: MemberActivityFy }) {
  return (
    <>
      <div className="member-act-group">
        <div className="member-act-heading">
          Events attended ({group.events.length})
        </div>
        {group.events.length === 0 ? (
          <div className="admin-shelf-empty-tab">No events attended</div>
        ) : (
          <div className="admin-list">
            {group.events.map((e) => (
              <div key={e.id} className="admin-list-item">
                <span className="admin-list-item-name">{e.title}</span>
                <span className="admin-list-item-meta">
                  {formatDate(e.startsAt)} · {e.typeLabel}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="member-act-group">
        <div className="member-act-heading">
          Surveys answered ({group.surveys.length})
        </div>
        {group.surveys.length === 0 ? (
          <div className="admin-shelf-empty-tab">No surveys answered</div>
        ) : (
          <div className="admin-list">
            {group.surveys.map((s) => (
              <SurveyItem key={s.id} survey={s} />
            ))}
          </div>
        )}
      </div>
    </>
  );
}

// One survey row. Click to expand the member's full response.
function SurveyItem({ survey }: { survey: ActivitySurvey }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="member-act-survey">
      <button
        type="button"
        className="member-act-survey-row"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
      >
        <span className="admin-list-item-name">
          {survey.title}
          <span className="member-act-tag">{survey.sourceLabel}</span>
        </span>
        <span className="admin-list-item-meta">
          {survey.score != null ? `${survey.score}/5` : "—"}
          <span className="member-act-caret">{open ? "▴" : "▾"}</span>
        </span>
      </button>
      {open && (
        <div className="member-act-answers">
          {survey.answers.length === 0 ? (
            <div className="admin-shelf-empty-tab">No answer detail</div>
          ) : (
            survey.answers.map((a, i) => (
              <div className="admin-shelf-row" key={i}>
                <div className="admin-shelf-row-label">{a.label}</div>
                <div className="admin-shelf-row-value">{a.value}</div>
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}
