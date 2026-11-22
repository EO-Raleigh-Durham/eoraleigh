import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { roleAtLeast } from "@/lib/access";
import { robotsFor } from "@/lib/access-map";
import { getLatestGrantSponsor, getLiveGrant } from "@/lib/access-grants-server";
import { CONTRACTOR_HOME, CONTRACTOR_NDA_PATH, grantState } from "@/lib/access-grants";
import { signOut } from "@/app/profile/actions";
import "../../admin/admin.css";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = {
  title: "Access not active",
  robots: robotsFor("guest"),
};

export const dynamic = "force-dynamic";

function formatDay(day: string): string {
  return new Date(day + "T00:00:00Z").toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });
}

// Where a signed-in contractor lands when their grant is missing, expired or
// revoked. Outside /board so it cannot redirect-loop.
export default async function ContractorAccessPage() {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  if (roleAtLeast(user.role, "board")) redirect("/board/chapter-dashboard");

  const grant = user.role === "contractor" ? await getLiveGrant(user.id, "sap_pipeline") : null;
  const state = grant ? grantState(grant) : null;
  if (state === "active") redirect(CONTRACTOR_HOME);
  if (state === "nda_required") redirect(CONTRACTOR_NDA_PATH);

  // Expired, revoked or no grant: name the sponsor to ask, when we know one.
  const latest = user.role === "contractor" ? await getLatestGrantSponsor(user.id, "sap_pipeline") : null;
  const ended = state === "expired" || Boolean(latest?.revoked);
  const message = ended
    ? state === "expired" && latest?.expiresAt
      ? `Your access to the SAP pipeline ended on ${formatDay(latest.expiresAt)}.`
      : "Your access to the SAP pipeline has ended."
    : "You don't have access to the SAP pipeline right now.";
  const ask = latest?.sponsorName
    ? `Ask ${latest.sponsorName} to renew it.`
    : `Contact the ${CHAPTER_NAME} board member who invited you to renew it.`;

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-brand">{CHAPTER_NAME}</div>
        <h1 style={{ fontSize: 20, margin: "16px 0 8px" }}>Access not active</h1>
        <p>{message}</p>
        <p>{ask}</p>
        <form action={signOut}>
          <button type="submit" className="admin-btn admin-btn--ghost">
            Sign out
          </button>
        </form>
      </div>
    </div>
  );
}
