import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { stripe } from "@/lib/stripe";
import { duesYearLabel, duesWindow } from "@/lib/dues";
import { PrintButton } from "./PrintButton";
import { CHAPTER_BOARD_EMAIL, CHAPTER_CITY, CHAPTER_DOMAIN, CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = {
  title: "Dues Invoice",
  description: `One member's dues invoice for the ${CHAPTER_NAME} membership year.`,
};
export const dynamic = "force-dynamic";

const DUES_AMOUNT_CENTS = 220000; // $2,200.00 net dues (board-set); year label from src/lib/dues

function fmt(cents: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );
}

function fmtDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export default async function DuesInvoicePage({
  params,
}: {
  params: Promise<{ sessionId: string }>;
}) {
  const { sessionId } = await params;

  let session;
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, {
      expand: ["payment_intent"],
    });
  } catch {
    notFound();
  }

  if (session.metadata?.type !== "dues" || session.payment_status !== "paid") {
    notFound();
  }

  const name =
    session.metadata?.member_name || session.customer_details?.name || "Member";
  const email = session.customer_email || session.customer_details?.email || "";
  const company = session.metadata?.company || "";
  const amountTotal = session.amount_total ?? DUES_AMOUNT_CENTS;
  const processingFee = Math.max(0, amountTotal - DUES_AMOUNT_CENTS);
  const pi =
    typeof session.payment_intent === "object" && session.payment_intent !== null
      ? session.payment_intent.id
      : (session.payment_intent as string | null) ?? "";

  const paidAt = fmtDate(session.created);
  const invoiceNum = `INV-FY27-${sessionId.slice(-8).toUpperCase()}`;

  return (
    <div className="invoice-shell">
      <div className="invoice-toolbar no-print">
        <Link href="/board/dues-invoices" className="dur-back">
          ← All Invoices
        </Link>
        <PrintButton />
      </div>

      <div className="invoice-page" id="invoice">
        <header className="invoice-header">
          <div className="invoice-org">
            <div className="invoice-org-name">{CHAPTER_NAME}</div>
            <div className="invoice-org-sub">
              Entrepreneurs&apos; Organization{CHAPTER_CITY ? ` · ${CHAPTER_CITY} Chapter` : ""}
            </div>
          </div>
          <div className="invoice-meta">
            <div className="invoice-meta-title">RECEIPT</div>
            <table className="invoice-meta-table">
              <tbody>
                <tr>
                  <th>Receipt No.</th>
                  <td>{invoiceNum}</td>
                </tr>
                <tr>
                  <th>Date Paid</th>
                  <td>{paidAt}</td>
                </tr>
                <tr>
                  <th>Status</th>
                  <td>
                    <span className="invoice-paid-badge">✓ PAID</span>
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </header>

        <div className="invoice-divider" />

        <section className="invoice-bill">
          <div className="invoice-bill-label">BILLED TO</div>
          <div className="invoice-bill-name">{name}</div>
          {email && <div className="invoice-bill-detail">{email}</div>}
          {company && <div className="invoice-bill-detail">{company}</div>}
        </section>

        <table className="invoice-items">
          <thead>
            <tr>
              <th>Description</th>
              <th className="invoice-col-amount">Amount (USD)</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td>
                <strong>{CHAPTER_NAME} Local Chapter Dues, FY {duesYearLabel()}</strong>
                <div className="invoice-item-sub">
                  Membership year: {duesWindow()}
                </div>
              </td>
              <td className="invoice-col-amount">{fmt(DUES_AMOUNT_CENTS)}</td>
            </tr>
            {processingFee > 0 && (
              <tr>
                <td>
                  Card processing fee
                  <div className="invoice-item-sub">Absorbed by member per chapter policy</div>
                </td>
                <td className="invoice-col-amount">{fmt(processingFee)}</td>
              </tr>
            )}
          </tbody>
          <tfoot>
            <tr className="invoice-total-row">
              <td>Total charged</td>
              <td className="invoice-col-amount">{fmt(amountTotal)}</td>
            </tr>
          </tfoot>
        </table>

        <div className="invoice-payment-ref">
          <span>Payment method: Credit card via Stripe</span>
          {pi && <span>Transaction ref: {pi}</span>}
        </div>

        <footer className="invoice-footer">
          <p>
            This receipt confirms that the above member has paid their local chapter dues for
            the {duesYearLabel()} fiscal year.
          </p>
          <p>{[CHAPTER_NAME, CHAPTER_DOMAIN, CHAPTER_BOARD_EMAIL].filter(Boolean).join(" · ")}</p>
        </footer>
      </div>
    </div>
  );
}
