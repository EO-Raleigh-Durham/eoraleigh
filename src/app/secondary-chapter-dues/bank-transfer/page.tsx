import { pageMeta } from "@/lib/page-metadata";
import { duesUsd, duesYearLabel, duesWindow } from "@/lib/dues";
import { getOpenDuesYear } from "@/lib/dues-server";
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
  const open = await getOpenDuesYear();
  const dues = open && (open.secondaryCents ?? 0) != null ? open : null;

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

  if (!dues) {
    return (
      <main className="dur-page">
        <section className="dur-card dur-card--center">
          <p className="dur-eyebrow">{CHAPTER_NAME}</p>
          <h1 className="dur-title">Dues are not open yet</h1>
          <p className="dur-lead">
            The board has not opened dues for the new membership year. Please check back soon or contact the chapter
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
          Renewing your {CHAPTER_NAME} secondary chapter membership for FY {duesYearLabel(dues.fyStart)} via bank transfer.
          Complete this form and our team will walk you through the contract and
          invoice process.
        </p>

        <div className="dur-vat-notice">
          <strong>VAT note:</strong> Secondary chapter dues are {duesUsd((dues.secondaryCents ?? 0))}. A VAT invoice
          requires an additional <strong>8% VAT</strong> — bringing the total to{" "}
          <strong>{duesUsd(Math.round((dues.secondaryCents ?? 0) * 1.08))}</strong>. This fee is required by {DUES_VAT_LAW} and
          is not included in the base dues.
        </div>

        <div className="dur-amount" style={{ marginBottom: 28 }}>
          <span className="dur-amount-value">{duesUsd(Math.round((dues.secondaryCents ?? 0) * 1.08))}</span>
          <span className="dur-amount-note">{duesUsd((dues.secondaryCents ?? 0))} dues + 8% VAT · Membership year {duesYearLabel(dues.fyStart)}</span>
        </div>

        <SecondaryBankTransferForm />
      </section>
    </main>
  );
}
