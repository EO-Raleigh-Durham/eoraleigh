import { pageMeta } from "@/lib/page-metadata";
import { JoinClient } from "./JoinClient";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = pageMeta({
  title: "Apply · Membership for $1M+ Founders",
  description:
    `Apply for ${CHAPTER_NAME} membership. Open to founders running $1M+ businesses who want Forum, signature events, and a global peer network of 20,000 entrepreneurs.`,
  path: "/join",
});

export default function JoinPage() {
  return <JoinClient />;
}
