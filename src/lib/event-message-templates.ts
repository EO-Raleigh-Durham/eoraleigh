import { CHAPTER_NAME } from "../kernel/config/chapter.ts";

export type ReminderTemplateContext = {
  eventTitle: string;
  eventDate: string;
  eventTime: string;
  eventLocation: string | null;
  eventUrl: string;
};

export function buildReminderTemplate(context: ReminderTemplateContext): {
  subject: string;
  body: string;
} {
  const logistics = [
    `Date: ${context.eventDate}`,
    `Time: ${context.eventTime}`,
    context.eventLocation ? `Venue: ${context.eventLocation}` : null,
    `Event details: ${context.eventUrl}`,
  ].filter((line): line is string => Boolean(line));

  return {
    subject: `Reminder: ${context.eventTitle}`,
    body: [
      `A quick reminder about ${context.eventTitle}. We're looking forward to seeing you there.`,
      logistics.join("\n"),
      "If your plans have changed, please reply to this email so we can update the guest list.",
      `See you soon,\n${CHAPTER_NAME}`,
    ].join("\n\n"),
  };
}
