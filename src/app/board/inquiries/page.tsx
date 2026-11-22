import type { Metadata } from "next";
import { listBoardInquiries } from "@/lib/inquiries";
import { MarkInboxRead } from "./MarkInboxRead";
import { CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

export const metadata: Metadata = {
  title: "Member messages",
  description: "Messages members have sent to the board through the internal site.",
};
export const dynamic = "force-dynamic";

function fmt(iso: string): string {
  return new Date(iso).toLocaleString("en-US", {
    timeZone: CHAPTER_TIME_ZONE,
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default async function BoardInquiriesPage() {
  const inquiries = await listBoardInquiries();

  return (
    <div>
      <MarkInboxRead />
      <div className="admin-page-head">
        <div className="admin-eyebrow">Member messages</div>
        <h1 className="admin-page-title">Messages to the board</h1>
        <p className="admin-page-sub">
          Questions and suggestions members sent from the portal&apos;s Contact
          the Board page. Reply by email to the sender.
        </p>
      </div>

      {inquiries.length === 0 ? (
        <p className="admin-page-sub">No member messages yet.</p>
      ) : (
        <ul className="brd-inq-list">
          {inquiries.map((q) => (
            <li key={q.id} className="brd-inq-card">
              <div className="brd-inq-head">
                <span className="brd-inq-subject">{q.subject ?? "(no subject)"}</span>
                <span className="brd-inq-date">{fmt(q.createdAt)}</span>
              </div>
              <div className="brd-inq-from">
                {q.fromName ?? "A member"}
                {q.fromEmail ? (
                  <>
                    {" · "}
                    <a href={`mailto:${q.fromEmail}?subject=Re: ${encodeURIComponent(q.subject ?? "Your message")}`}>
                      {q.fromEmail}
                    </a>
                  </>
                ) : null}
              </div>
              <p className="brd-inq-message">{q.message}</p>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
