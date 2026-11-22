import Link from "next/link";
import { SapForm } from "../SapForm";
import { requireArea } from "@/lib/access-grants-server";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "New SAP partner",
  description: `Add a company to the ${CHAPTER_NAME} Strategic Alliance Partner pipeline.`,
};

export default async function NewSapPartnerPage() {
  await requireArea("sap_pipeline", { edit: true });
  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">
          <Link href="/board/strategic-alliance-partners">Strategic Alliance Partners</Link>
        </div>
        <h1 className="admin-page-title">New partner</h1>
        <p className="admin-page-sub">
          Add a company to the SAP pipeline. Set status to Lead for an early prospect, or Won if the deal is already signed.
        </p>
      </div>
      <SapForm />
    </div>
  );
}
