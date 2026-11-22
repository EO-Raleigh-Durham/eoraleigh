import type { Metadata } from "next";
import { ContactBoardForm } from "./ContactBoardForm";
import { requireMemberOrAbove } from "@/lib/auth";

export const metadata: Metadata = { title: "Contact the board" };
export const dynamic = "force-dynamic";

export default async function PortalContactBoardPage() {
  await requireMemberOrAbove();
  return (
    <section className="section">
      <div className="container container--text">
        <span className="eyebrow eyebrow--accent">Contact the board</span>
        <h1 className="display-3" style={{ marginTop: 12, marginBottom: 8 }}>
          Send a message to the board
        </h1>
        <p className="lead text-muted" style={{ marginBottom: 32 }}>
          A question, an idea, or something the chapter should know. It goes
          straight to the board.
        </p>
        <ContactBoardForm />
      </div>
    </section>
  );
}
