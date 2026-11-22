"use client";

import { useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  CHANNEL_SOURCES,
  CLOSED_LOST_DESCRIPTIONS,
  DISQUALIFICATION_REASONS,
  MEMBER_ACQUISITION_STAGES,
  MEMBERSHIP_TYPES,
  fullName,
  type DealCompany,
  type DealPerson,
  type DealRow,
} from "@/lib/deals";
import {
  createDeal,
  deleteDeal,
  findCompanies,
  findPeople,
  updateDeal,
} from "./actions";
import { NoteFeed } from "../NoteFeed";

type Props = {
  deal?: DealRow | null;
  person?: DealPerson | null;
  company?: DealCompany | null;
  staff: DealPerson[];
  saved?: boolean;
  // Shelf mode: save/delete close the shelf + refresh instead of navigating.
  onClose?: () => void;
};

function triValue(v: boolean | null | undefined): string {
  if (v === true) return "yes";
  if (v === false) return "no";
  return "";
}

const CLOSE_STAGES = new Set(["Closed Won", "Closed Lost"]);

export function ProspectForm({
  deal,
  person,
  company,
  staff,
  saved,
  onClose,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(deal);
  const isShelf = Boolean(onClose);

  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [stage, setStage] = useState<string>(
    deal?.stage ?? MEMBER_ACQUISITION_STAGES[0],
  );

  // Person / company linking (create mode only; edit keeps the existing links).
  const [personMode, setPersonMode] = useState<"existing" | "new">("existing");
  const [companyMode, setCompanyMode] = useState<"existing" | "new">("existing");
  const [pickedPerson, setPickedPerson] = useState<DealPerson | null>(null);
  const [pickedCompany, setPickedCompany] = useState<DealCompany | null>(null);

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res =
        isEdit && deal
          ? await updateDeal(deal.id, formData)
          : await createDeal(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (isShelf) {
        onClose?.();
        router.refresh();
      } else {
        router.push(`/board/prospects/${res.id}?saved=1`);
        router.refresh();
      }
    });
  }

  function handleDelete() {
    if (!isEdit || !deal) return;
    if (!confirm(`Delete "${deal.name}"? This removes the deal record.`)) return;
    startTransition(async () => {
      const res = await deleteDeal(deal.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (isShelf) {
        onClose?.();
        router.refresh();
      } else {
        router.push("/board/prospects?deleted=1");
      }
    });
  }

  const showClose = CLOSE_STAGES.has(stage);

  return (
    <div>
      {saved && <div className="admin-banner admin-banner--ok">Saved.</div>}
      {error && <div className="admin-banner admin-banner--err">{error}</div>}

      <form action={handleSubmit} className="admin-form">
        {/* ── Person ─────────────────────────────────────────── */}
        <h2 className="admin-section-h2">Contact</h2>
        {isEdit ? (
          <p className="admin-page-sub" style={{ marginTop: 0 }}>
            {person
              ? `Linked to ${fullName(person)} (${person.email})`
              : "No contact linked"}
          </p>
        ) : (
          <LinkPicker
            kind="person"
            mode={personMode}
            onModeChange={setPersonMode}
            picked={
              pickedPerson
                ? { id: pickedPerson.id, label: `${fullName(pickedPerson)} · ${pickedPerson.email}` }
                : null
            }
            onPick={(p) => setPickedPerson(p as DealPerson | null)}
          />
        )}

        {/* ── Company ────────────────────────────────────────── */}
        <h2 className="admin-section-h2" style={{ marginTop: 24 }}>
          Company
        </h2>
        {isEdit ? (
          <p className="admin-page-sub" style={{ marginTop: 0 }}>
            {company ? company.name : "No company linked"}
          </p>
        ) : (
          <LinkPicker
            kind="company"
            mode={companyMode}
            onModeChange={setCompanyMode}
            picked={
              pickedCompany
                ? { id: pickedCompany.id, label: pickedCompany.name ?? "Company" }
                : null
            }
            onPick={(c) => setPickedCompany(c as DealCompany | null)}
          />
        )}

        {/* ── Deal ───────────────────────────────────────────── */}
        <h2 className="admin-section-h2" style={{ marginTop: 24 }}>
          Deal
        </h2>
        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Deal name</span>
            <input
              name="name"
              type="text"
              required
              defaultValue={deal?.name ?? ""}
              placeholder="e.g. Jane Doe — Acme Co"
            />
          </label>
        </div>

        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Stage</span>
            <select
              name="stage"
              value={stage}
              onChange={(e) => setStage(e.target.value)}
            >
              {MEMBER_ACQUISITION_STAGES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span className="admin-label">Relationship manager</span>
            <select
              name="relationship_manager_id"
              defaultValue={deal?.relationship_manager_id ?? ""}
            >
              <option value="">— None —</option>
              {staff.map((m) => (
                <option key={m.id} value={m.id}>
                  {fullName(m)}
                </option>
              ))}
            </select>
          </label>
        </div>

        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Amount</span>
            <input
              name="amount"
              type="number"
              min={0}
              step={1}
              defaultValue={deal?.amount ?? ""}
              placeholder="0"
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Currency</span>
            <input
              name="currency"
              type="text"
              defaultValue={deal?.currency ?? "USD"}
              placeholder="USD"
            />
          </label>
        </div>

        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Channel source</span>
            <select
              name="channel_source"
              defaultValue={deal?.channel_source ?? ""}
            >
              <option value="">— Unknown —</option>
              {CHANNEL_SOURCES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span className="admin-label">Primary interest</span>
            <select
              name="primary_interest"
              defaultValue={deal?.primary_interest ?? ""}
            >
              <option value="">— Unspecified —</option>
              {MEMBERSHIP_TYPES.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </label>
        </div>

        {/* Keyed on the saved text so both boxes reset after a save. */}
        <div className="admin-form-row" key={deal?.description ?? ""}>
          <div className="admin-field admin-field--full">
            <span className="admin-label">Notes</span>
            {isEdit && <NoteFeed text={deal?.description ?? null} />}
            <label className="note-feed-add">
              <span className="note-feed-add__label">Add a note</span>
              <textarea
                name="new_note"
                rows={3}
                placeholder="What happened, next steps, blockers. Saved with today's date."
              />
            </label>
            {isEdit && deal?.description ? (
              <details className="note-feed-edit">
                <summary>Edit all notes</summary>
                <textarea name="description" rows={10} defaultValue={deal.description} />
              </details>
            ) : (
              <input type="hidden" name="description" value={deal?.description ?? ""} />
            )}
          </div>
        </div>

        {/* ── Qualification ──────────────────────────────────── */}
        <h2 className="admin-section-h2" style={{ marginTop: 24 }}>
          Qualification
        </h2>
        <div className="admin-form-row admin-form-row--2">
          <TriField
            name="ql_founder_controlling_owner"
            label="Founder / controlling owner"
            value={deal?.ql_founder_controlling_owner}
          />
          <TriField
            name="ql_revenue_verified"
            label="Revenue verified ($1M+)"
            value={deal?.ql_revenue_verified}
          />
        </div>
        <div className="admin-form-row admin-form-row--2">
          <TriField
            name="ql_financial_commitment"
            label="Financial commitment"
            value={deal?.ql_financial_commitment}
          />
          <TriField
            name="ql_time_commitment"
            label="Time commitment"
            value={deal?.ql_time_commitment}
          />
        </div>

        {/* ── Close (conditional) ────────────────────────────── */}
        {showClose && (
          <>
            <h2 className="admin-section-h2" style={{ marginTop: 24 }}>
              Close details
            </h2>
            {stage === "Closed Won" ? (
              <div className="admin-form-row">
                <label className="admin-field admin-field--full">
                  <span className="admin-label">Closed-won reason</span>
                  <input
                    name="closed_won_reason"
                    type="text"
                    defaultValue={deal?.closed_won_reason ?? ""}
                    placeholder="Why they joined"
                  />
                </label>
              </div>
            ) : (
              <>
                <div className="admin-form-row admin-form-row--2">
                  <label className="admin-field">
                    <span className="admin-label">Closed-lost reason</span>
                    <select
                      name="closed_lost_description"
                      defaultValue={deal?.closed_lost_description ?? ""}
                    >
                      <option value="">— Select a reason —</option>
                      {CLOSED_LOST_DESCRIPTIONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="admin-field">
                    <span className="admin-label">Disqualification reason</span>
                    <select
                      name="disqualification_reason"
                      defaultValue={deal?.disqualification_reason ?? ""}
                    >
                      <option value="">— None —</option>
                      {DISQUALIFICATION_REASONS.map((d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <div className="admin-form-row">
                  <label className="admin-field admin-field--full">
                    <span className="admin-label">Notes on loss</span>
                    <input
                      name="closed_lost_reason"
                      type="text"
                      defaultValue={deal?.closed_lost_reason ?? ""}
                      placeholder="Optional detail"
                    />
                  </label>
                </div>
              </>
            )}
          </>
        )}

        <div className="admin-form-actions">
          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            disabled={pending}
          >
            {pending ? "Saving..." : isEdit ? "Save changes" : "Create deal"}
          </button>
          {isShelf ? (
            <button
              type="button"
              className="admin-btn admin-btn--ghost"
              onClick={onClose}
              disabled={pending}
            >
              Cancel
            </button>
          ) : (
            <Link href="/board/prospects" className="admin-btn admin-btn--ghost">
              Cancel
            </Link>
          )}
          {isEdit && (
            <button
              type="button"
              className="admin-btn admin-btn--danger"
              onClick={handleDelete}
              disabled={pending}
              style={{ marginLeft: "auto" }}
            >
              Delete
            </button>
          )}
        </div>
      </form>
    </div>
  );
}

// ── Person / company picker (existing typeahead OR new inline) ──
type PickerProps = {
  kind: "person" | "company";
  mode: "existing" | "new";
  onModeChange: (m: "existing" | "new") => void;
  picked: { id: string; label: string } | null;
  onPick: (item: DealPerson | DealCompany | null) => void;
};

function LinkPicker({ kind, mode, onModeChange, picked, onPick }: PickerProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<(DealPerson | DealCompany)[]>([]);
  const [open, setOpen] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const idField = kind === "person" ? "person_id" : "company_id";
  const modeField = kind === "person" ? "person_mode" : "company_mode";

  function runSearch(q: string) {
    if (timer.current) clearTimeout(timer.current);
    if (q.trim().length < 2) {
      setResults([]);
      setOpen(false);
      return;
    }
    timer.current = setTimeout(async () => {
      const items =
        kind === "person" ? await findPeople(q) : await findCompanies(q);
      setResults(items);
      setOpen(true);
    }, 250);
  }

  function label(item: DealPerson | DealCompany): string {
    if (kind === "person") {
      const p = item as DealPerson;
      return `${fullName(p)} · ${p.email}`;
    }
    const c = item as DealCompany;
    return c.name ?? "Company";
  }

  return (
    <>
      <input type="hidden" name={modeField} value={mode} />
      <div className="admin-form-row">
        <div className="funnel-filter funnel-filter-check">
          <label className="admin-label" style={{ marginRight: 12 }}>
            <input
              type="radio"
              checked={mode === "existing"}
              onChange={() => onModeChange("existing")}
            />{" "}
            Link existing
          </label>
          <label className="admin-label">
            <input
              type="radio"
              checked={mode === "new"}
              onChange={() => onModeChange("new")}
            />{" "}
            Add new
          </label>
        </div>
      </div>

      {mode === "existing" ? (
        <div className="admin-form-row">
          <label className="admin-field admin-field--full" style={{ position: "relative" }}>
            <span className="admin-label">
              {picked ? "Selected" : `Search ${kind}s`}
            </span>
            {picked ? (
              <div className="funnel-card-row">
                <span className="funnel-pill">{picked.label}</span>
                <button
                  type="button"
                  className="admin-btn admin-btn--ghost"
                  onClick={() => {
                    onPick(null);
                    setQuery("");
                  }}
                >
                  Change
                </button>
                <input type="hidden" name={idField} value={picked.id} />
              </div>
            ) : (
              <>
                <input
                  type="text"
                  value={query}
                  autoComplete="off"
                  placeholder={`Type at least 2 characters`}
                  onChange={(e) => {
                    setQuery(e.target.value);
                    runSearch(e.target.value);
                  }}
                />
                {open && results.length > 0 && (
                  <ul className="funnel-typeahead">
                    {results.map((item) => (
                      <li key={item.id}>
                        <button
                          type="button"
                          onClick={() => {
                            onPick(item);
                            setOpen(false);
                          }}
                        >
                          {label(item)}
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </>
            )}
          </label>
        </div>
      ) : kind === "person" ? (
        <>
          <div className="admin-form-row admin-form-row--2">
            <label className="admin-field">
              <span className="admin-label">First name</span>
              <input name="new_person_first" type="text" />
            </label>
            <label className="admin-field">
              <span className="admin-label">Last name</span>
              <input name="new_person_last" type="text" />
            </label>
          </div>
          <div className="admin-form-row admin-form-row--2">
            <label className="admin-field">
              <span className="admin-label">Email</span>
              <input name="new_person_email" type="email" placeholder="name@company.com" />
            </label>
            <label className="admin-field">
              <span className="admin-label">Phone</span>
              <input name="new_person_phone" type="tel" />
            </label>
          </div>
          <div className="admin-form-row">
            <label className="admin-field admin-field--full">
              <span className="admin-label">City</span>
              <input name="new_person_city" type="text" />
            </label>
          </div>
        </>
      ) : (
        <>
          <div className="admin-form-row admin-form-row--2">
            <label className="admin-field">
              <span className="admin-label">Company name</span>
              <input name="new_company_name" type="text" />
            </label>
            <label className="admin-field">
              <span className="admin-label">Industry</span>
              <input name="new_company_industry" type="text" />
            </label>
          </div>
          <div className="admin-form-row">
            <label className="admin-field admin-field--full">
              <span className="admin-label">Fiscal-year gross revenue (USD)</span>
              <input name="new_company_revenue" type="number" min={0} step={1} />
            </label>
          </div>
        </>
      )}
    </>
  );
}

// ── Tri-state qualification select (Pending / Yes / No) ──
function TriField({
  name,
  label,
  value,
}: {
  name: string;
  label: string;
  value: boolean | null | undefined;
}) {
  return (
    <label className="admin-field">
      <span className="admin-label">{label}</span>
      <select name={name} defaultValue={triValue(value)}>
        <option value="">Pending</option>
        <option value="yes">Yes</option>
        <option value="no">No</option>
      </select>
    </label>
  );
}
