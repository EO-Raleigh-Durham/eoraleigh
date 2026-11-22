"use client";

import Link from "next/link";
import { type ComponentProps, useState } from "react";
import { RsvpForm } from "./RsvpForm";
import {
  type DinnerPath,
  RISE4_REGISTRATION_HREF,
  findDinnerTicketId,
} from "@/lib/myeo-dinner";

const PATH_DETAIL: Record<DinnerPath, string> = {
  member: "You are registering as an EO member.",
  guest: "You are registering as a guest.",
};

// The first question in front of the RSVP form for MyEO Beneath the Chopsticks:
// who is registering, an EO member (from this chapter or visiting) or a guest.
// Each answer lands on its own ticket, so the board roster shows which path the
// registrant took, and everyone gets the same short form (name, email, phone,
// food allergies). Only the Guest ticket shows the invitation code box. RISE 4
// registration stays one click away under the question, as a dark button so it
// reads as different from the two answers.
export function MyeoDinnerRsvp({
  formProps,
}: {
  formProps: ComponentProps<typeof RsvpForm>;
}) {
  const [path, setPath] = useState<DinnerPath | null>(null);

  if (path) {
    const ticketId = findDinnerTicketId(formProps.tickets, path);
    return (
      <div className="myeo-gate">
        <p className="myeo-gate__summary">
          <span>Dinner registration</span>
          <span className="myeo-gate__detail">{PATH_DETAIL[path]}</span>
          <button type="button" className="myeo-gate__change" onClick={() => setPath(null)}>
            Change my answer
          </button>
        </p>
        {path === "guest" && (
          <p className="myeo-gate__note">
            Dinner seats for guests are by invitation. Enter the code you were sent below.
          </p>
        )}
        <RsvpForm
          key={path}
          {...formProps}
          initialTicketTypeId={ticketId}
          hideTicketPicker={Boolean(ticketId)}
        />
      </div>
    );
  }

  return (
    <fieldset className="myeo-gate">
      <legend className="myeo-gate__question">Which best describes you?</legend>
      <div className="myeo-gate__actions">
        <button type="button" className="btn btn--primary" onClick={() => setPath("member")}>
          EO member
        </button>
        <button type="button" className="btn btn--ghost" onClick={() => setPath("guest")}>
          Guest
        </button>
      </div>
      <p className="myeo-gate__note">
        This dinner follows RISE 4 on 13 November, 2 to 6 PM. Not registered for RISE 4 yet?
      </p>
      <Link href={RISE4_REGISTRATION_HREF} className="btn btn--dark myeo-gate__rise4">
        Register for RISE 4 &rarr;
      </Link>
    </fieldset>
  );
}
