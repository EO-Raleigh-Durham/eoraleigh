import type { Metadata } from "next";
import { getMemberDirectory } from "@/lib/directory";
import { requireMemberOrAbove } from "@/lib/auth";
import { DirectoryClient } from "./DirectoryClient";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata: Metadata = { title: "Member directory" };
export const dynamic = "force-dynamic";

export default async function PortalDirectoryPage() {
  await requireMemberOrAbove();
  const members = await getMemberDirectory();

  return (
    <section className="section">
      <div className="container">
        <span className="eyebrow eyebrow--accent">Member directory</span>
        <h1 className="display-3" style={{ marginTop: 12, marginBottom: 8 }}>
          The {CHAPTER_NAME} member directory
        </h1>
        <p className="lead text-muted" style={{ marginBottom: 32 }}>
          Every active member of the chapter. Contact details stay private:
          reach anyone through Connect and we pass your note along.
        </p>

        {members.length === 0 ? (
          <p className="text-muted">The directory is being prepared. Check back soon.</p>
        ) : (
          <DirectoryClient members={members} />
        )}
      </div>
    </section>
  );
}
