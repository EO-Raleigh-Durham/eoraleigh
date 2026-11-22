import Link from "next/link";
import { EventForm } from "../EventForm";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = {
  title: "New event",
  description: `Create a new ${CHAPTER_NAME} event with date, venue, and tickets.`,
};

export default function NewEventPage() {
  return (
    <div>
      <div className="admin-page-head">
        <div className="admin-breadcrumb">
          <Link href="/board/events">Events</Link>
          <span>/</span>
          <span>New</span>
        </div>
        <h1 className="admin-page-title">Create event</h1>
        <p className="admin-page-sub">
          Save as draft to keep it private until you are ready, or publish straight to the calendar.
        </p>
      </div>
      <EventForm />
    </div>
  );
}
