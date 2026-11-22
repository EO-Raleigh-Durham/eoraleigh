import type { Metadata } from "next";
import Link from "next/link";
import { stripe, isStripeConfigured } from "@/lib/stripe";

export const metadata: Metadata = {
  title: "Dues Invoices",
  description: "Membership dues invoices for the fiscal year and who has paid.",
};
export const dynamic = "force-dynamic";

function fmt(cents: number | null): string {
  if (cents == null) return "—";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(
    cents / 100
  );
}

function fmtDate(ts: number): string {
  return new Date(ts * 1000).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export default async function DuesInvoicesPage() {
  if (!isStripeConfigured()) {
    return (
      <div className="admin-page">
        <div className="admin-page-head">
          <h1 className="admin-page-title">Dues Invoices</h1>
          <p className="admin-page-sub">Stripe is not configured.</p>
        </div>
      </div>
    );
  }

  const sessions = await stripe.checkout.sessions.list({ limit: 100 });

  const dueSessions = sessions.data.filter(
    (s) => s.metadata?.type === "dues" && s.payment_status === "paid"
  );

  return (
    <div className="admin-page">
      <div className="admin-page-head">
        <div className="admin-eyebrow">Finance</div>
        <h1 className="admin-page-title">Dues Invoices</h1>
        <p className="admin-page-sub">
          {dueSessions.length === 0
            ? "No dues payments received yet"
            : `${dueSessions.length} paid · FY 2026/2027 local chapter dues`}
        </p>
      </div>

      {dueSessions.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Email</th>
                <th>Company</th>
                <th>Amount</th>
                <th>Date paid</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {dueSessions.map((s) => (
                <tr key={s.id}>
                  <td>{s.metadata?.member_name || s.customer_details?.name || "—"}</td>
                  <td>{s.customer_email || s.customer_details?.email || "—"}</td>
                  <td>{s.metadata?.company || "—"}</td>
                  <td>{fmt(s.amount_total)}</td>
                  <td>{fmtDate(s.created)}</td>
                  <td>
                    <Link
                      href={`/board/dues-invoices/${s.id}`}
                      className="admin-table-action"
                    >
                      View invoice →
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
