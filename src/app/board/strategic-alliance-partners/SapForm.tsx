"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  SAP_DEAL_STATUS_LABEL,
  SAP_DEAL_STATUS_ORDER,
  SAP_DEAL_TYPE_AMOUNT,
  SAP_PIPELINE_STAGES,
  SAP_PIPELINE_STAGE_LABEL,
  type CompanyRow,
  type SapContact,
  type SapDealRow,
  type SapDealType,
} from "@/lib/sap";
import { createPartner, deletePartner, updatePartner } from "./actions";

type Props = {
  deal?: SapDealRow | null;
  company?: CompanyRow | null;
  contacts?: SapContact[];
  referredBy?: { id: string; name: string | null } | null;
  saved?: boolean;
  // Board and above: show Delete and the link to the referring member's
  // profile. Contractors (false) can edit but not delete or open members.
  boardView?: boolean;
  // When provided, the form is being shown inside the shelf — save/delete
  // close the shelf and refresh the parent list instead of navigating.
  onClose?: () => void;
};

const TIER_LABEL_WITH_PRICE: Record<SapDealType, string> = {
  platinum: `Platinum — $${SAP_DEAL_TYPE_AMOUNT.platinum.toLocaleString()}`,
  gold: `Gold — $${SAP_DEAL_TYPE_AMOUNT.gold.toLocaleString()}`,
  silver: `Silver — $0 (discount only)`,
};

export function SapForm({
  deal,
  company,
  contacts = [],
  referredBy,
  saved,
  boardView = false,
  onClose,
}: Props) {
  const router = useRouter();
  const isEdit = Boolean(deal && company);
  const isShelf = Boolean(onClose);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [tier, setTier] = useState<SapDealType | "">(deal?.deal_type ?? "");
  const [status, setStatus] = useState<string>(deal?.status ?? "lead");
  const [amountTouched, setAmountTouched] = useState(false);
  const [amount, setAmount] = useState<string>(
    deal ? String(deal.amount_usd) : "0",
  );

  function handleTierChange(value: string) {
    const next = value === "" ? "" : (value as SapDealType);
    setTier(next);
    if (!amountTouched) {
      setAmount(next === "" ? "0" : String(SAP_DEAL_TYPE_AMOUNT[next]));
    }
  }

  function handleSubmit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const res =
        isEdit && deal && company
          ? await updatePartner(deal.id, company.id, formData)
          : await createPartner(formData);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (isShelf) {
        onClose?.();
        router.refresh();
      } else if (isEdit) {
        router.push(
          `/board/strategic-alliance-partners/${res.dealId}?saved=1`,
        );
        router.refresh();
      } else {
        router.push(
          `/board/strategic-alliance-partners/${res.dealId}?saved=1`,
        );
      }
    });
  }

  function handleDelete() {
    if (!isEdit || !deal || !company) return;
    if (
      !confirm(
        `Delete "${company.name}"? This removes the SAP deal record but keeps the company row.`,
      )
    ) {
      return;
    }
    startTransition(async () => {
      const res = await deletePartner(deal.id);
      if (!res.ok) {
        setError(res.error);
        return;
      }
      if (isShelf) {
        onClose?.();
        router.refresh();
      } else {
        router.push("/board/strategic-alliance-partners?deleted=1");
      }
    });
  }

  return (
    <div>
      {saved && <div className="admin-banner admin-banner--ok">Saved.</div>}
      {error && <div className="admin-banner admin-banner--err">{error}</div>}

      <form action={handleSubmit} className="admin-form">
        <h2 className="admin-section-h2">Company</h2>

        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Name</span>
            <input
              name="name"
              type="text"
              required
              defaultValue={company?.name ?? ""}
              placeholder="Company name"
            />
          </label>
        </div>

        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Industry</span>
            <input
              name="industry"
              type="text"
              defaultValue={company?.industry ?? ""}
              placeholder="Automobile"
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Website</span>
            <input
              name="website"
              type="url"
              defaultValue={company?.website ?? ""}
              placeholder="https://example.com"
            />
          </label>
        </div>

        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Company notes</span>
            <textarea
              name="company_notes"
              rows={3}
              defaultValue={company?.notes ?? ""}
              placeholder="Long-lived facts about the company"
            />
          </label>
        </div>

        <h2 className="admin-section-h2" style={{ marginTop: 24 }}>Deal</h2>

        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Status</span>
            <select
              name="status"
              required
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              {SAP_DEAL_STATUS_ORDER.map((st) => (
                <option key={st} value={st}>
                  {SAP_DEAL_STATUS_LABEL[st]}
                </option>
              ))}
            </select>
          </label>
          <label className="admin-field">
            <span className="admin-label">Tier</span>
            <select
              name="deal_type"
              value={tier}
              onChange={(e) => handleTierChange(e.target.value)}
            >
              <option value="">— None —</option>
              <option value="platinum">{TIER_LABEL_WITH_PRICE.platinum}</option>
              <option value="gold">{TIER_LABEL_WITH_PRICE.gold}</option>
              <option value="silver">{TIER_LABEL_WITH_PRICE.silver}</option>
            </select>
          </label>
        </div>

        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Amount (USD)</span>
            <input
              name="amount_usd"
              type="number"
              min={0}
              step={1}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setAmountTouched(true);
              }}
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Discount (free text)</span>
            <input
              name="discount_note"
              type="text"
              defaultValue={deal?.discount_note ?? ""}
              placeholder="10% off all rooms; 15% F&B"
            />
          </label>
        </div>

        {isEdit && (
          <div className="admin-form-row admin-form-row--2">
            <label className="admin-field">
              <span className="admin-label">Pipeline stage</span>
              <select
                name="pipeline_stage"
                defaultValue={deal?.pipeline_stage ?? ""}
                disabled={status !== "in_discussion"}
              >
                <option value="">
                  {status === "in_discussion" ? "Not set" : "Only for In discussion"}
                </option>
                {SAP_PIPELINE_STAGES.map((st) => (
                  <option key={st} value={st}>
                    {SAP_PIPELINE_STAGE_LABEL[st]}
                  </option>
                ))}
              </select>
            </label>
            <div className="admin-form-row admin-form-row--2" style={{ margin: 0 }}>
              <label className="admin-field">
                <span className="admin-label">Cash (USD)</span>
                <input
                  name="cash_usd"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={deal?.cash_usd ?? ""}
                />
              </label>
              <label className="admin-field">
                <span className="admin-label">In-kind (USD)</span>
                <input
                  name="in_kind_usd"
                  type="number"
                  min={0}
                  step={1}
                  defaultValue={deal?.in_kind_usd ?? ""}
                />
              </label>
            </div>
          </div>
        )}

        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Deal owner</span>
            <input
              name="deal_owner"
              type="text"
              defaultValue={deal?.deal_owner ?? ""}
              placeholder="Board member name"
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Introduced by</span>
            <input
              name="introduced_by"
              type="text"
              defaultValue={deal?.introduced_by ?? ""}
              placeholder="Chloe"
            />
          </label>
        </div>

        {referredBy?.id && (
          <div className="admin-form-row">
            <div className="admin-field admin-field--full">
              <span className="admin-label">Referred by (member)</span>
              <span style={{ paddingTop: 2 }}>
                {boardView ? (
                  <Link href={`/board/members/${referredBy.id}`}>
                    {referredBy.name ?? "View member profile"}
                  </Link>
                ) : (
                  referredBy.name ?? "A member"
                )}
              </span>
            </div>
          </div>
        )}

        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Motivation</span>
            <input
              name="motivation"
              type="text"
              defaultValue={deal?.motivation ?? ""}
              placeholder="Why they would want this partnership"
            />
          </label>
        </div>

        <div className="admin-form-row">
          <label className="admin-field admin-field--full">
            <span className="admin-label">Deal notes</span>
            <textarea
              name="deal_notes"
              rows={4}
              defaultValue={deal?.notes ?? ""}
              placeholder="Conversation history, next steps, blockers"
            />
          </label>
        </div>

        <div className="admin-form-row admin-form-row--2">
          <label className="admin-field">
            <span className="admin-label">Last contact</span>
            <input
              name="last_contact_at"
              type="date"
              defaultValue={deal?.last_contact_at ?? ""}
            />
          </label>
          <label className="admin-field">
            <span className="admin-label">Next follow-up</span>
            <input
              name="next_followup_at"
              type="date"
              defaultValue={deal?.next_followup_at ?? ""}
            />
          </label>
        </div>

        {isEdit && (
          <div className="admin-form-row">
            <label className="admin-field admin-field--full">
              <span className="admin-label">Next step</span>
              <input
                name="next_step"
                type="text"
                defaultValue={deal?.next_step ?? ""}
                placeholder="Coffee with Chris to walk through the Gold package"
              />
              <span style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}>
                The one concrete thing that moves this deal forward. Shows in Today.
              </span>
            </label>
          </div>
        )}

        <div className="admin-form-row">
          <label className="admin-field">
            <span className="admin-label">Close-won date</span>
            <input
              name="closed_won_at"
              type="date"
              defaultValue={deal?.closed_won_at ?? ""}
            />
            <span
              style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 4 }}
            >
              When the deal was secured. Sets the fiscal year its amount counts
              toward on the chapter dashboard. Leave blank until won
            </span>
          </label>
        </div>

        <div className="admin-form-actions">
          <button
            type="submit"
            className="admin-btn admin-btn--primary"
            disabled={pending}
          >
            {pending ? "Saving..." : isEdit ? "Save changes" : "Create partner"}
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
            <Link
              href="/board/strategic-alliance-partners"
              className="admin-btn admin-btn--ghost"
            >
              Cancel
            </Link>
          )}
          {isEdit && boardView && (
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

      {isEdit && contacts.length > 0 && (
        <div style={{ marginTop: 32 }}>
          <h2 className="admin-section-h2">Contacts at this company</h2>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Phone</th>
                </tr>
              </thead>
              <tbody>
                {contacts.map((c) => (
                  <tr key={c.id}>
                    <td>{c.name ?? "—"}</td>
                    <td className="admin-table-meta">{c.email}</td>
                    <td className="admin-table-meta">{c.phone ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
