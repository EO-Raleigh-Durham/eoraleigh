import { pageMeta } from "@/lib/page-metadata";
import { CancellationFeeForm } from "./CancellationFeeForm";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = pageMeta({
  title: "Event Late Cancellation Fee",
  description:
    `Pay the $100 late cancellation fee for cancelling an ${CHAPTER_NAME} event within 48 hours. Paid securely by card.`,
  path: "/late-cancellation-fee",
});

export default async function LateCancellationFeePage({
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
            Thank you. Your late cancellation fee has been paid. A receipt is on its
            way to your email
          </p>
        </section>
      </main>
    );
  }

  return (
    <main className="dur-page">
      <section className="dur-card">
        <p className="dur-eyebrow">{CHAPTER_NAME}</p>
        <h1 className="dur-title">Event Late Cancellation Fee</h1>
        <p className="dur-lead">
          A $100 fee applies when an event registration is cancelled within 48 hours
          of the event
        </p>

        <div className="dur-amount">
          <span className="dur-amount-value">$100</span>
          <span className="dur-amount-note">Late cancellation fee · Card processing fee added at checkout</span>
        </div>

        {cancelled === "1" && (
          <div className="dur-form-error" role="alert">
            Checkout was cancelled. You can try again below
          </div>
        )}

        <CancellationFeeForm />
      </section>
    </main>
  );
}
