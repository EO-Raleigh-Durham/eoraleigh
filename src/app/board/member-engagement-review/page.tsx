import { redirect } from "next/navigation";

// The review now lives on The Pulse of the Chapter: the 2x2 with six filters
// and one member list under it (Dave, 20 Nov 2026). Old links keep working.
export default async function MemberEngagementReviewPage({
  searchParams,
}: {
  searchParams: Promise<{ signal?: string }>;
}) {
  const { signal } = await searchParams;
  redirect(`/board/the-pulse-of-the-chapter${signal ? `?signal=${encodeURIComponent(signal)}` : ""}`);
}
