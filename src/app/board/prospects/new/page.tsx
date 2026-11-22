import Link from "next/link";
import { getEoStaff } from "@/lib/deals";
import { ProspectForm } from "../ProspectForm";
import "../../funnel.css";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "New prospect",
  description: `Add a new membership prospect to the ${CHAPTER_NAME} pipeline.`,
};
export const dynamic = "force-dynamic";

export default async function NewProspectPage() {
  const staff = await getEoStaff();

  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-eyebrow">
          <Link href="/board/prospects">Prospects</Link>
        </div>
        <h1 className="admin-page-title">New deal</h1>
        <p className="admin-page-sub">
          Add a deal to the Member Acquisition pipeline. Link an existing
          contact and company, or create new ones inline.
        </p>
      </div>

      <ProspectForm staff={staff} />
    </div>
  );
}
