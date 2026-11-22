import Link from "next/link";
import { DealNotes } from "@/components/internal/DealNotes";
import { notFound } from "next/navigation";
import { getSapPartnerById } from "@/lib/sap";
import { SapForm } from "../SapForm";
import { requireArea } from "@/lib/access-grants-server";
import { roleAtLeast } from "@/lib/access";

export const metadata = {
  title: "Edit SAP partner",
  description: "Edit one Strategic Alliance Partner: status, deal value, and contacts.",
};

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string }>;

export default async function SapEditPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const viewer = await requireArea("sap_pipeline");
  const { id } = await params;
  const sp = await searchParams;
  const partner = await getSapPartnerById(id);
  if (!partner) notFound();

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">
          <Link href="/board/strategic-alliance-partners">Strategic Alliance Partners</Link>
        </div>
        <h1 className="admin-page-title">{partner.company.name}</h1>
        <p className="admin-page-sub">
          Edit deal details, tier, discount, owner, and next follow-up.
        </p>
      </div>

      <SapForm
        deal={partner.deal}
        company={partner.company}
        contacts={partner.contacts}
        referredBy={partner.referredBy}
        saved={sp.saved === "1"}
        boardView={roleAtLeast(viewer.role, "board")}
      />

      <DealNotes kind="sap" dealId={partner.deal.id} />
    </div>
  );
}
