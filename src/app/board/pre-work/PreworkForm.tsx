"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import {
  MAX_ANSWER_CHARS,
  PREWORK_SECTIONS,
  listKey,
  partKey,
  rankedKeys,
  type PreworkAnswers,
  type PreworkQuestion,
} from "@/lib/board-prework";
import { savePrework } from "./actions";
import { CHAPTER_TIME_ZONE_LABEL } from "@/kernel/config/chapter";

type Props = {
  name: string;
  role: string | null;
  initialAnswers: PreworkAnswers;
  initialFinished: boolean;
  open: boolean;
  // "Wednesday 25 November": the last day the form is open.
  closes: string;
  // The instructions shown above the form while it is being filled in.
  children: React.ReactNode;
};
type Status = { kind: "idle" | "pending" | "saving" } | { kind: "saved"; at: string } | { kind: "error"; message: string };

const SAVE_DELAY_MS = 1200;
const range = (n: number) => Array.from({ length: n }, (_, i) => i + 1);
const clock = (iso: string) =>
  new Date(iso).toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

export default function PreworkForm({ name, role, initialAnswers, initialFinished, open, closes, children }: Props) {
  const [answers, setAnswers] = useState<PreworkAnswers>(initialAnswers);
  const [finished, setFinished] = useState(initialFinished);
  const [status, setStatus] = useState<Status>({ kind: "idle" });

  // The latest answers and the save in flight live in refs so a save always
  // sends what is on screen now, and saves never overlap or arrive out of order.
  const latest = useRef(answers);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saving = useRef(false);
  const again = useRef<{ finished?: boolean } | null>(null);

  async function save(finishedMark?: boolean) {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    if (saving.current) {
      again.current = { finished: finishedMark ?? again.current?.finished };
      return;
    }
    saving.current = true;
    setStatus({ kind: "saving" });
    const result = await savePrework(latest.current, finishedMark);
    saving.current = false;
    if (result.ok) {
      setFinished(Boolean(result.submittedAt));
      // Finishing swaps the long form for the short thank-you: show its top.
      if (finishedMark) window.scrollTo({ top: 0 });
      setStatus({ kind: "saved", at: result.savedAt });
    } else {
      setStatus({ kind: "error", message: result.error });
    }
    const next = again.current;
    again.current = null;
    if (next && result.ok) void save(next.finished);
  }

  function update(changes: PreworkAnswers) {
    const next = { ...latest.current, ...changes };
    latest.current = next;
    setAnswers(next);
    setStatus({ kind: "pending" });
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => void save(), SAVE_DELAY_MS);
  }

  // Leaving with unsaved typing: ask the browser to warn first.
  const unsaved = status.kind === "pending" || status.kind === "saving" || status.kind === "error";
  useEffect(() => {
    if (!unsaved) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [unsaved]);

  const field = (key: string, label: string, multiline: boolean, placeholder?: string) => {
    const shared = {
      value: answers[key] ?? "",
      "aria-label": label,
      placeholder,
      disabled: !open,
      maxLength: MAX_ANSWER_CHARS,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => update({ [key]: e.target.value }),
    };
    return multiline ? <textarea rows={4} {...shared} /> : <input type="text" {...shared} />;
  };

  function swapRanked(id: string, a: number, b: number) {
    const ka = rankedKeys(id, a);
    const kb = rankedKeys(id, b);
    const now = latest.current;
    update({
      [ka.criterion]: now[kb.criterion] ?? "",
      [ka.why]: now[kb.why] ?? "",
      [kb.criterion]: now[ka.criterion] ?? "",
      [kb.why]: now[ka.why] ?? "",
    });
  }

  function body(q: PreworkQuestion) {
    switch (q.kind) {
      case "text":
        return <div className="admin-field">{field(q.id, q.title, true)}</div>;
      case "list":
        return (
          <ol className="bpw-list">
            {range(q.count).map((n) => (
              <li key={n} className="admin-field">
                {field(listKey(q.id, n), `${q.title} ${n}`, false)}
              </li>
            ))}
          </ol>
        );
      case "labelled":
        return (
          <div className="bpw-parts">
            {q.parts.map((p) => (
              <label key={p.key} className="admin-field">
                <span className="admin-label">{p.label}</span>
                {field(partKey(q.id, p.key), p.label, true)}
              </label>
            ))}
          </div>
        );
      case "ranked":
        return (
          <ol className="bpw-ranked">
            {range(q.count).map((n) => {
              const keys = rankedKeys(q.id, n);
              return (
                <li key={n} className="bpw-ranked-row">
                  <span className="bpw-rank">{n}</span>
                  <div className="admin-field">{field(keys.criterion, `Criterion ranked ${n}`, false, "Criterion")}</div>
                  <div className="admin-field">{field(keys.why, `Why criterion ${n} matters`, false, "Why it matters")}</div>
                  <div className="bpw-move">
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      disabled={!open || n === 1}
                      onClick={() => swapRanked(q.id, n, n - 1)}
                      aria-label={`Move criterion ${n} up`}
                    >
                      ↑
                    </button>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost"
                      disabled={!open || n === q.count}
                      onClick={() => swapRanked(q.id, n, n + 1)}
                      aria-label={`Move criterion ${n} down`}
                    >
                      ↓
                    </button>
                  </div>
                </li>
              );
            })}
          </ol>
        );
    }
  }

  // Finished and still before the deadline: a thank-you instead of the form,
  // with a way back in to change answers.
  if (open && finished) {
    const busy = status.kind === "saving";
    return (
      <section className="bpw-done-card" role="status">
        <div className="bpw-done-mark" aria-hidden="true">
          <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
            <path d="M5 12.5l4.5 4.5L19 7.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </div>
        <h2 className="bpw-done-title">Congratulations, {name.split(" ")[0]}. You&rsquo;re done</h2>
        <p className="bpw-done-text">
          Thank you for taking the time to be candid. Your answers are saved, and we look forward to seeing
          you at the Board workshop.
        </p>
        <p className="bpw-done-text">
          Want to change something? You can reopen your worksheet until 9 PM on {closes}, {CHAPTER_TIME_ZONE_LABEL}.
        </p>
        <div className="bpw-done-actions">
          <button type="button" className="admin-btn admin-btn--primary" disabled={busy} onClick={() => void save(false)}>
            {busy ? "Opening" : "Back to draft"}
          </button>
          <Link className="admin-btn admin-btn--ghost" href="/board/pre-work/report">
            See who has finished
          </Link>
        </div>
        {status.kind === "error" && <p className="bpw-status--err">{status.message}</p>}
        <p className="bpw-motto">Lead to serve. Build to last.</p>
      </section>
    );
  }

  return (
    <form className="bpw-form" onSubmit={(e) => e.preventDefault()}>
      {children}
      <section className="frm-group bpw-who">
        <div className="admin-field">
          <span className="admin-label">Name</span>
          <div className="bpw-name">{name}</div>
        </div>
        <div className="admin-field">
          <span className="admin-label">Current Board role</span>
          <div className="bpw-name">{role ?? "No board seat on record this year"}</div>
        </div>
      </section>

      {PREWORK_SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="admin-section-title">
            {section.number ? `${section.number} · ` : ""}
            {section.title}
          </div>
          {section.questions.map((q) => (
            <section key={q.id} className="frm-group bpw-q">
              <div className="bpw-q-title">
                {q.number && <span className="bpw-q-num">{q.number}</span>}
                {q.title}
              </div>
              {q.hint && <p className="bpw-q-hint">{q.hint}</p>}
              {body(q)}
            </section>
          ))}
        </div>
      ))}

      {open && (
        <div className="bpw-bar">
          <div className="bpw-status" role="status">
            {status.kind === "error" ? (
              <span className="bpw-status--err">{status.message}</span>
            ) : status.kind === "saving" || status.kind === "pending" ? (
              "Saving"
            ) : status.kind === "saved" ? (
              `Saved at ${clock(status.at)}`
            ) : (
              "Your answers save as you type"
            )}
          </div>
          <div className="bpw-bar-actions">
            {status.kind === "error" && (
              <button type="button" className="admin-btn admin-btn--ghost" onClick={() => void save()}>
                Try again
              </button>
            )}
            <button type="button" className="admin-btn admin-btn--primary" onClick={() => void save(true)}>
              Mark as finished
            </button>
          </div>
        </div>
      )}
    </form>
  );
}
