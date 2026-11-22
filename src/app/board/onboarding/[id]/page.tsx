import Link from "next/link";
import { DealNotes } from "@/components/internal/DealNotes";
import { notFound } from "next/navigation";
import { fullName, getDealById, getEoStaff } from "@/lib/deals";
import { OnboardingForm } from "../OnboardingForm";
import "../../funnel.css";

export const metadata = {
  title: "Edit onboarding deal",
  description: "Edit one onboarding deal: stage, owner, and details.",
};

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;
type SearchParams = Promise<{ saved?: string }>;

export default async function OnboardingEditPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { id } = await params;
  const sp = await searchParams;
  const [card, staff] = await Promise.all([getDealById(id), getEoStaff()]);
  if (!card) notFound();

  const title = card.person ? fullName(card.person) : card.deal.name;

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">
          <Link href="/board/onboarding">Onboarding</Link>
        </div>
        <h1 className="admin-page-title">{title}</h1>
        <p className="admin-page-sub">
          Edit contact, company, stage, and onboarding notes.
        </p>
      </div>

      <OnboardingForm
        deal={card.deal}
        person={card.person}
        company={card.company}
        staff={staff}
        saved={sp.saved === "1"}
      />

      <DealNotes kind="prospect" dealId={card.deal.id} />
    </div>
  );
}
