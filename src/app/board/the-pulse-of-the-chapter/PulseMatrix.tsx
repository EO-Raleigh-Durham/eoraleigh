import Link from "next/link";
import { NEW_MEMBER_STATUS_LABEL, type EngagementSignal, type MemberEngagementDetail, type NewMemberRow } from "@/lib/engagement";
import { suggestedStep, whyLine } from "@/lib/member-signal";
import { addEngagementCard } from "./engagement-actions";

// The 2x2 with every member's name in their quadrant, and one list under it
// filtered by six tabs: All, New, Healthy, Drifting, Value risk, At risk
// (Dave, 20 Nov 2026). Each row says why the member sits there and suggests a
// next step; the Member Engagement chair adds it to her Workboard with +.

const LABEL: Record<string, string> = { healthy: "Healthy", value_risk: "Value risk", drifting: "Drifting", at_risk: "At risk", new: "New" };

const Q: { key: EngagementSignal; label: string; hint: string; tone: string }[] = [
  { key: "healthy", label: "Healthy", hint: "Event in 90 days, rates it 4+", tone: "ok" },
  { key: "value_risk", label: "Value risk", hint: "Event in 90 days, rates it under 4", tone: "warn" },
  { key: "drifting", label: "Drifting", hint: "In a forum, no event in 90 days", tone: "drift" },
  { key: "at_risk", label: "At risk", hint: "No event in 90 days and no forum, or rates it under 4", tone: "bad" },
];

export function PulseMatrix({
  members,
  selected,
  showNew,
  newMembers,
  onWorkboard,
}: {
  members: MemberEngagementDetail[];
  selected: EngagementSignal | null;
  showNew: boolean;
  newMembers: NewMemberRow[];
  onWorkboard: Set<string>;
}) {
  const of = (s: EngagementSignal) => members.filter((m) => m.signal === s).sort((a, b) => a.name.localeCompare(b.name));
  const healthy = of("healthy").length;
  const scored = members.filter((m) => m.signal !== "new").length;
  const list = selected ? of(selected) : [...members].sort((a, b) => a.name.localeCompare(b.name));
  const tabs = [
    { key: "", label: "All", count: members.length },
    { key: "new", label: "New", count: newMembers.length },
    { key: "healthy", label: "Healthy", count: of("healthy").length },
    { key: "drifting", label: "Drifting", count: of("drifting").length },
    { key: "value_risk", label: "Value risk", count: of("value_risk").length },
    { key: "at_risk", label: "At risk", count: of("at_risk").length },
  ];
  const current = showNew ? "new" : (selected ?? "");

  return (
    <div>
      <p className="pm-sub">
        {healthy} of {scored} members healthy ({scored ? Math.round((healthy / scored) * 100) : 0}%). Click a box or a filter to see who, why and what to do.
      </p>
      <div className="pm-grid">
        <div />
        <div className="pm-ax">Rates it 4 or above</div>
        <div className="pm-ax">Rates it under 4</div>
        <div className="pm-ax pm-ax--row">Event in the last 90 days</div>
        {Q.slice(0, 2).map((q) => <Box key={q.key} q={q} people={of(q.key)} active={selected === q.key} />)}
        <div className="pm-ax pm-ax--row">No event in 90 days</div>
        {Q.slice(2).map((q) => <Box key={q.key} q={q} people={of(q.key)} active={selected === q.key} />)}
      </div>

      <nav className="pm-tabs pm-filters" aria-label="Filter members">
        {tabs.map((t) => (
          <Link key={t.label} href={t.key ? `?signal=${t.key}` : "?"} scroll={false} className={`pm-tab${current === t.key ? " is-active" : ""}`}>
            {t.label} <span className="pm-muted">{t.count}</span>
          </Link>
        ))}
      </nav>

      <section className="pm-list">
        {showNew ? (
          newMembers.length === 0 ? (
            <p className="pm-sub">Nobody in their first year of membership.</p>
          ) : (
            <ul>
              {newMembers.map((m) => (
                <li key={m.personId}>
                  <Link href={`/board/members/${m.personId}`} className="pm-name">{m.name}</Link>
                  <span className="pm-why">
                    {m.daysAsMember} days in, {m.eventsAttended} event{m.eventsAttended === 1 ? "" : "s"}, {m.inForum ? "in a forum" : "no forum yet"}
                  </span>
                  <span className="pm-step"><span>{NEW_MEMBER_STATUS_LABEL[m.status]}</span></span>
                </li>
              ))}
            </ul>
          )
        ) : list.length === 0 ? (
          <p className="pm-sub">Nobody here.</p>
        ) : (
          <ul>
            {list.map((m) => {
              const input = {
                eventsLast90: m.eventsLast90,
                inForum: m.inForum,
                secondary: m.membershipType === "secondary_member",
                latestPulse: m.latestPulse,
                avgEventRating: m.avgEventRating,
              };
              const why = whyLine(input);
              const step = suggestedStep(m.signal, input);
              return (
                <li key={m.personId}>
                  <span>
                    <Link href={`/board/members/${m.personId}`} className="pm-name">{m.name}</Link>
                    {!selected && <span className={`pm-tag pm-tag--${m.signal}`}>{LABEL[m.signal] ?? m.signal}</span>}
                  </span>
                  <span className="pm-why">{why}{m.overrideNote ? ` · board note: ${m.overrideNote}` : ""}</span>
                  <span className="pm-step">
                    {step ? (
                      <>
                        <span>{step}</span>
                        {onWorkboard.has(m.personId) ? (
                          <span className="pm-done">On Workboard</span>
                        ) : (
                          <form action={addEngagementCard}>
                            <input type="hidden" name="person_id" value={m.personId} />
                            <input type="hidden" name="step" value={step} />
                            <input type="hidden" name="why" value={why} />
                            <button className="pm-add" aria-label={`Add "${step}" for ${m.name} to the Member Engagement Workboard`} title="Add to the Member Engagement chair's Workboard">+</button>
                          </form>
                        )}
                      </>
                    ) : (
                      <span className="pm-muted">No action needed</span>
                    )}
                  </span>
                </li>
              );
            })}
          </ul>
        )}
      </section>
    </div>
  );
}

function Box({ q, people, active }: { q: (typeof Q)[number]; people: MemberEngagementDetail[]; active: boolean }) {
  return (
    <Link href={active ? "?" : `?signal=${q.key}`} scroll={false} className={`pm-box pm-box--${q.tone}${active ? " is-active" : ""}`}>
      <span className="pm-box-head">
        <b>{q.label}</b>
        <span className="pm-count">{people.length}</span>
      </span>
      <span className="pm-hint">{q.hint}</span>
      <span className="pm-names">
        {people.map((m) => (
          <span key={m.personId} className="pm-chip">{m.name}</span>
        ))}
      </span>
    </Link>
  );
}
