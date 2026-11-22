import { notFound } from "next/navigation";
import { Logo } from "@/components/Logo";
import { getEventBySlugOrId } from "@/lib/events";
import { SurveyForm } from "./SurveyForm";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { id } = await params;
  const event = await getEventBySlugOrId(id);
  return {
    title: event ? `Feedback · ${event.title}` : "Event feedback",
    robots: { index: false, follow: false },
  };
}

export default async function EventSurveyPage({ params }: { params: Params }) {
  const { id } = await params;
  const event = await getEventBySlugOrId(id);
  if (!event) notFound();
  // Survey is only live for published events that have it switched on.
  if (event.status === "draft" || !event.survey_enabled) notFound();

  return (
    <div className="svy-page">
      <div className="svy-card">
        <Logo />
        <span className="svy-eyebrow">Event feedback</span>
        <h1 className="svy-title">{event.title}</h1>
        <p className="svy-intro">
          A quick 1-minute survey. Your feedback helps us improve future {CHAPTER_NAME} events
        </p>
        <SurveyForm eventId={event.id} />
      </div>
    </div>
  );
}
