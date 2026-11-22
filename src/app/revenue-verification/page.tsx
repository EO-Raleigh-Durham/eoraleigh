import { pageMeta } from "@/lib/page-metadata";
import { RevenueVerificationClient } from "./RevenueVerificationClient";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = pageMeta({
  title: "Revenue Verification",
  description:
    `Verify your company's annual revenue as part of ${CHAPTER_NAME} membership. Upload your financial statement and complete the declaration.`,
  robots: { index: false, follow: false },
  path: "/revenue-verification",
});

// searchParams is async in Next.js 16.
export default async function RevenueVerificationPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const sp = await searchParams;
  const raw = sp.email;
  const email = (Array.isArray(raw) ? raw[0] : raw) ?? "";
  return <RevenueVerificationClient initialEmail={email} />;
}
