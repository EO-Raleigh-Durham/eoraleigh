import { pageMeta } from "@/lib/page-metadata";
import { duesUsd, duesYearLabel, duesWindow } from "@/lib/dues";
import { getOpenDuesYear } from "@/lib/dues-server";
import Link from "next/link";
import { DuesForm } from "./DuesForm";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export async function generateMetadata() {
  const dues = await getOpenDuesYear();
  const year = dues ? duesYearLabel(dues.fyStart) : null;
  const amount = dues ? dues.primaryCents : null;
  return pageMeta({
    title: year ? `Chapter Dues Renewal ${year}` : "Chapter Dues Renewal",
    description:
      year && amount != null
        ? `Renew your ${CHAPTER_NAME} local chapter dues for the ${year} membership year. ${duesUsd(amount)}, paid securely by card.`
        : `Renew your ${CHAPTER_NAME} local chapter dues.`,
    path: "/chapter-dues",
  });
}

export default async function DuesRenewalPage({
  searchParams,
}: {
  searchParams: Promise<{ paid?: string; cancelled?: string }>;
}) {
  const { paid, cancelled } = await searchParams;
  const open = await getOpenDuesYear();
  const dues = open && open.primaryCents != null ? open : null;

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
            Thank you for renewing your {CHAPTER_NAME} chapter dues{dues ? ` for ${duesYearLabel(dues.fyStart)}` : ""}. A
            receipt is on its way to your email
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
        <p className="dur-eyebrow">{CHAPTER_NAME}</p>
        <h1 className="dur-title">Chapter Dues Renewal {duesYearLabel(dues.fyStart)}</h1>
        <p className="dur-lead">
          Renew your local chapter membership for the year running {duesWindow(dues.fyStart)}
        </p>

        <div className="dur-amount">
          <span className="dur-amount-value">{duesUsd(dues.primaryCents)}</span>
          <span className="dur-amount-note">Membership year {duesYearLabel(dues.fyStart)} · Processing fee added at checkout</span>
        </div>

        {cancelled === "1" && (
          <div className="dur-form-error" role="alert">
            Checkout was cancelled. You can try again below
          </div>
        )}

        <DuesForm payLabel={`Pay ${duesUsd(dues.primaryCents)} by card`} />

        <div className="dur-divider">
          <span>or</span>
        </div>

        <Link href="/chapter-dues/bank-transfer" className="dur-alt-btn">
          Pay by bank transfer &amp; get VAT invoice
        </Link>
      </section>
    </main>
  );
}
