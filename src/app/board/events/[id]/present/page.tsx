import Link from "next/link";
import { notFound } from "next/navigation";
import { headers } from "next/headers";
import { getEventById, formatEventDate } from "@/lib/events";
import { qrSvg } from "@/lib/tickets";
import { CHAPTER_DOMAIN, CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Present event",
  description: "Full-screen projector view of an event's registration and survey QR codes.",
};
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

// Full-bleed projector view for the door / on-stage screen: the two QRs at
// poster size on EO base blue. Covers the admin shell via a fixed overlay so it
// reads as a clean display, not an admin page.
export default async function PresentEventPage({ params }: { params: Params }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const h = await headers();
  const host = h.get("host") || CHAPTER_DOMAIN;
  const proto =
    h.get("x-forwarded-proto") || (host.startsWith("localhost") ? "http" : "https");
  const origin = `${proto}://${host}`;
  const slug = event.slug ?? event.id;

  const registerUrl = `${origin}/events/${slug}`;
  const surveyUrl = `${origin}/events/${slug}/survey`;
  const surveyLive = event.survey_enabled && event.status !== "draft";

  const [registerSvg, surveySvg] = await Promise.all([
    qrSvg(registerUrl),
    surveyLive ? qrSvg(surveyUrl) : Promise.resolve(null),
  ]);

  const when = formatEventDate(event.starts_at, event.ends_at);

  return (
    <div className="hub-present">
      <Link
        href={`/board/events/${event.id}`}
        className="hub-present-close"
        aria-label="Close"
      >
        Close ✕
      </Link>

      <div className="hub-present-head">
        <div className="hub-present-eyebrow">{CHAPTER_NAME}</div>
        <h1 className="hub-present-title">{event.title}</h1>
        <div className="hub-present-meta">
          {when.full}
          {event.location ? ` · ${event.location}` : ""}
        </div>
      </div>

      <div className="hub-present-codes">
        <div className="hub-present-code">
          <div className="hub-present-code-label">Register</div>
          <div
            className="hub-present-qr"
            dangerouslySetInnerHTML={{ __html: registerSvg }}
          />
          <div className="hub-present-url">{registerUrl}</div>
        </div>

        {surveyLive && surveySvg && (
          <div className="hub-present-code">
            <div className="hub-present-code-label">Feedback</div>
            <div
              className="hub-present-qr"
              dangerouslySetInnerHTML={{ __html: surveySvg }}
            />
            <div className="hub-present-url">{surveyUrl}</div>
          </div>
        )}
      </div>
    </div>
  );
}
