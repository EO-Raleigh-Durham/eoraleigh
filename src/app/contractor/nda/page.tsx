import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getSessionUser } from "@/lib/auth";
import { roleAtLeast } from "@/lib/access";
import { robotsFor } from "@/lib/access-map";
import { getLiveGrant } from "@/lib/access-grants-server";
import { CONTRACTOR_ACCESS_PATH, CONTRACTOR_HOME, grantState } from "@/lib/access-grants";
import {
  CONTRACTOR_NDA_SECTIONS,
  CONTRACTOR_NDA_TITLE,
  CONTRACTOR_NDA_VERSION,
} from "@/content/legal/contractor-nda";
import { NdaForm } from "./NdaForm";
import "../../admin/admin.css";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = {
  title: "Confidentiality agreement",
  robots: robotsFor("guest"),
};

export const dynamic = "force-dynamic";

// A contractor's first stop after sign-in, and again whenever the NDA
// version changes. Outside /board so it cannot redirect-loop.
export default async function ContractorNdaPage() {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  // Board and above see a read-only preview of exactly what contractors see,
  // so the board can review the agreement. acceptNda refuses non-contractors.
  const preview = roleAtLeast(user.role, "board");
  if (!preview) {
    if (user.role !== "contractor") redirect(CONTRACTOR_ACCESS_PATH);
    const grant = await getLiveGrant(user.id, "sap_pipeline");
    const state = grant ? grantState(grant) : null;
    if (state === "active") redirect(CONTRACTOR_HOME);
    if (state !== "nda_required") redirect(CONTRACTOR_ACCESS_PATH);
  }

  return (
    <div className="auth-page">
      <div className="auth-card nda-card">
        <div className="auth-brand">{CHAPTER_NAME}</div>
        {preview && (
          <div className="nda-preview">
            Board preview: this is the page contractors see on first sign-in. Accepting is turned off for you.
          </div>
        )}
        <h1 className="nda-title">
          {CONTRACTOR_NDA_TITLE} ({CONTRACTOR_NDA_VERSION})
        </h1>
        <p className="nda-intro">
          You are about to see confidential partner and contact information. Please read and accept this
          agreement before you continue.
        </p>
        <NdaForm version={CONTRACTOR_NDA_VERSION} defaultName={user.fullName ?? ""} preview={preview}>
          {CONTRACTOR_NDA_SECTIONS.map((s) => (
            <section key={s.heading}>
              <h2>{s.heading}</h2>
              <p>{s.body}</p>
            </section>
          ))}
        </NdaForm>
      </div>
    </div>
  );
}
