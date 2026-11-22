import { redirect } from "next/navigation";

// The requalification results moved to the gated Membership page. Kept as a
// redirect so old links keep working.
export default function LegacyRequalificationResultsPage() {
  redirect("/board/requalification");
}
