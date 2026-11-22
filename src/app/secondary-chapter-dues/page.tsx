import { pageMeta } from "@/lib/page-metadata";
import Link from "next/link";
import { SecondaryDuesForm } from "./DuesForm";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = pageMeta({
  title: "Secondary Chapter Dues Renewal 2026/2027",
  description:
    `Renew your ${CHAPTER_NAME} secondary chapter dues for the 2026/2027 membership year. $1,500, paid securely by card.`,
  path: "/secondary-chapter-dues",
});

export default async function SecondaryDuesRenewalPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; cancelled?: string }>;
}) {
  const { paid, cancelled } = await searchParams;

  if (paid === "1") {
    return (
      <main className="dur-page">
        <section className="dur-card dur-card--center">
          <div className="dur-check" aria-hidden="true">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>
          <h1 className="dur-title">Payment received</h1>
          <p className="dur-lead">
            Thank you for renewing your {CHAPTER_NAME} secondary chapter dues for 2026/2027. A
            receipt is on its way to your email
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="dur-page">
      <section className="dur-card">
        <p className="dur-eyebrow">{CHAPTER_NAME}</p>
        <h1 className="dur-title">Secondary Chapter Dues Renewal 2026/2027</h1>
        <p className="dur-lead">
          Renew your secondary chapter membership for the year running July 1, 2026
          to June 30, 2027
        </p>

        <div className="dur-amount">
          <span className="dur-amount-value">$1,500</span>
          <span className="dur-amount-note">Membership year 2026/2027 · Processing fee added at checkout</span>
        </div>

        {cancelled === "1" && (
          <div className="dur-form-error" role="alert">
            Checkout was cancelled. You can try again below
          </div>
        )}

        <SecondaryDuesForm />

        <div className="dur-divider">
          <span>or</span>
        </div>

        <Link href="/secondary-chapter-dues/bank-transfer" className="dur-alt-btn">
          Pay by bank transfer &amp; get VAT invoice
        </Link>
      </section>
    </main>
  );
}
