import Link from "next/link";
import { notFound } from "next/navigation";
import {
  getEventById,
  getRegistrationsForEvent,
  formatEventDate,
} from "@/lib/events";
import { CheckInConsole } from "./CheckInConsole";
import { buildCheckInRoster } from "@/lib/check-in";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "Check in",
  description: `Door check-in for an ${CHAPTER_NAME} event: scan ticket QR codes or check guests in by name.`,
};
export const dynamic = "force-dynamic";

type Params = Promise<{ id: string }>;

export default async function CheckInPage({ params }: { params: Params }) {
  const { id } = await params;
  const event = await getEventById(id);
  if (!event) notFound();

  const registrations = await getRegistrationsForEvent(id);
  const roster = buildCheckInRoster(registrations);
  const date = formatEventDate(event.starts_at, event.ends_at);

  return (
    <div>
      <div className="admin-breadcrumb chk-breadcrumb">
        <Link href="/board/events">Events</Link>
        <span>/</span>
        <Link href={`/board/events/${id}`}>Event details</Link>
      </div>

      <CheckInConsole
        eventId={id}
        eventType={event.type}
        eventTitle={event.title}
        eventDate={date.full}
        initialRoster={roster}
      />
    </div>
  );
}
