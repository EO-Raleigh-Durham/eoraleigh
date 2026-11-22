import { pageMeta } from "@/lib/page-metadata";
import Link from "next/link";
import { SecondaryBankTransferForm } from "./BankTransferForm";
import { CHAPTER_NAME } from "@/kernel/config/chapter";
import { DUES_VAT_LAW } from "@/content/dues-copy";

export const metadata = pageMeta({
  title: "Bank Transfer & VAT Invoice",
  description:
    `Pay your ${CHAPTER_NAME} secondary chapter dues by bank transfer and request a VAT invoice.`,
  robots: "noindex",
  path: "/secondary-chapter-dues/bank-transfer",
});

export default async function SecondaryBankTransferPage({
  searchParams,
}: {
  searchParams: Promise<{ submitted?: string }>;
}) {
  const { submitted } = await searchParams;

  if (submitted === "1") {
    return (
      <main className="dur-page">
        <section className="dur-card dur-card--center">
          <div className="dur-check" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="dur-title">Request received</h1>
          <p className="dur-lead">
            Thank you. Our team will be in touch shortly to walk you through
            the contract and VAT invoice process.
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="dur-page">
      <section className="dur-card">
        <Link href="/secondary-chapter-dues" className="dur-back">
          ← Back
        </Link>
        <p className="dur-eyebrow">{CHAPTER_NAME}</p>
        <h1 className="dur-title">VAT Invoice &amp; Bank Transfer Request</h1>
        <p className="dur-lead">
          Renewing your {CHAPTER_NAME} secondary chapter membership for FY 2026/2027 via bank transfer.
          Complete this form and our team will walk you through the contract and
          invoice process.
        </p>

        <div className="dur-vat-notice">
          <strong>VAT note:</strong> Secondary chapter dues are $1,500. A VAT invoice
          requires an additional <strong>8% VAT</strong> — bringing the total to{" "}
          <strong>$1,620</strong>. This fee is required by {DUES_VAT_LAW} and
          is not included in the base dues.
        </div>

        <div className="dur-amount" style={{ marginBottom: 28 }}>
          <span className="dur-amount-value">$1,620</span>
          <span className="dur-amount-note">$1,500 dues + 8% VAT · Membership year 2026/2027</span>
        </div>

        <SecondaryBankTransferForm />
      </section>
    </main>
  );
}
