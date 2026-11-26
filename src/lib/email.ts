import {
  CHAPTER_BOARD_EMAIL,
  CHAPTER_MANAGER_EMAIL,
  CHAPTER_MANAGER_WHATSAPP,
  CHAPTER_MARKETING_EMAIL,
  CHAPTER_NAME,
  CHAPTER_PARTNERS_EMAIL,
  CHAPTER_TIME_ZONE,
} from "../kernel/config/chapter.ts";
import { Resend } from "resend";
import { toMajorUnits } from "./currency.ts";

// Server-only, env-flagged email. Dormant until RESEND_API_KEY is set:
// every send is a no-op that returns false, so the rest of the events flow
// (on-screen tickets, check-in) works with zero email configuration.
//
// The chapter's domain is DKIM/SPF verified in Resend, so the default
// chapter manager sender (chapter config) authenticates. Override with
// EVENT_FROM_EMAIL if needed. NEVER import from a client component.

const apiKey = process.env.RESEND_API_KEY;
const FROM =
  process.env.EVENT_FROM_EMAIL || `${CHAPTER_NAME} <${CHAPTER_MANAGER_EMAIL}>`;
const NOMINATION_TO =
  process.env.SAP_NOMINATION_NOTIFY_EMAIL || CHAPTER_PARTNERS_EMAIL;

const resend = apiKey ? new Resend(apiKey) : null;

// " or WhatsApp +1..." in cancellation policies, when a number is configured.
const MANAGER_WHATSAPP = CHAPTER_MANAGER_WHATSAPP ? ` or WhatsApp ${CHAPTER_MANAGER_WHATSAPP}` : "";

export function isEmailConfigured(): boolean {
  return Boolean(apiKey);
}

const TZ = CHAPTER_TIME_ZONE;
const whenFmt = new Intl.DateTimeFormat("en-US", {
  timeZone: TZ,
  weekday: "short",
  month: "short",
  day: "numeric",
  year: "numeric",
  hour: "numeric",
  minute: "2-digit",
});

export type TicketEmailInput = {
  to: string;
  name: string | null;
  eventTitle: string;
  startsAt: string;
  endsAt: string | null;
  location: string | null;
  ticketUrl: string;
  ticketCode: string;
  teamRegistration?: {
    url: string;
    discountedUnitAmount: number;
    currency: string;
  };
  // Overrides the standard USD$200 no-show fee quoted below. See
  // src/lib/event-fee-overrides.ts.
  noShowFeeUsd?: number;
  // True for prepaid events whose payments are non-refundable: the policy
  // section says so instead of quoting the late-cancellation and no-show fees.
  // See src/lib/event-fee-overrides.ts.
  nonRefundable?: boolean;
};

// Best-effort ticket email. Returns true only if Resend accepted the message.
// Never throws — a mail failure must not break a paid or free registration.
export async function sendTicketEmail(input: TicketEmailInput): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: input.to,
      subject: `Your ticket: ${input.eventTitle}`,
      html: renderTicketEmailHtml(input),
    });
    if (error) {
      console.warn("sendTicketEmail:", error.message ?? String(error));
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      "sendTicketEmail threw:",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

export function renderTicketEmailHtml(i: TicketEmailInput): string {
  const noShowFeeUsd = i.noShowFeeUsd ?? 200;
  const when = whenFmt.format(new Date(i.startsAt));
  const greeting = i.name ? `Hi ${escapeHtml(i.name)},` : "Hi,";
  const loc = i.location
    ? `<tr><td style="padding:4px 0;color:#5E617D;font-size:13px;width:64px">Where</td><td style="padding:4px 0;color:#0C0C31;font-size:14px">${escapeHtml(i.location)}</td></tr>`
    : "";
  const teamRegistration = i.teamRegistration
    ? `<tr><td style="padding-top:24px;border-top:1px solid #ECEDF2">
          <div style="font-size:17px;font-weight:700;color:#0C0C31">Bring your team</div>
          <div style="padding-top:6px;color:#5E617D;font-size:14px;line-height:1.5">Register colleagues for ${escapeHtml(formatEmailMoney(i.teamRegistration.discountedUnitAmount, i.teamRegistration.currency))} per person.</div>
          <a href="${escapeHtml(i.teamRegistration.url)}" style="display:inline-block;margin-top:14px;border:1px solid #3D46F2;color:#3D46F2;text-decoration:none;font-weight:700;font-size:14px;padding:11px 18px;border-radius:8px">Register my team</a>
        </td></tr>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#F6F7FA;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7FA;padding:32px 16px">
    <tr><td align="center">
      <table width="460" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #ECEDF2;padding:28px">
        <tr><td style="font-size:13px;color:#3D46F2;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">${CHAPTER_NAME}</td></tr>
        <tr><td style="padding-top:14px;color:#0C0C31;font-size:15px">${greeting}</td></tr>
        <tr><td style="padding-top:6px;color:#5E617D;font-size:14px;line-height:1.5">You are confirmed for the event below. Open your ticket to show the QR code at the door.</td></tr>
        <tr><td style="padding-top:18px"><div style="font-size:20px;font-weight:700;color:#0C0C31;line-height:1.25">${escapeHtml(i.eventTitle)}</div></td></tr>
        <tr><td style="padding-top:14px">
          <table cellpadding="0" cellspacing="0">
            <tr><td style="padding:4px 0;color:#5E617D;font-size:13px;width:64px">When</td><td style="padding:4px 0;color:#0C0C31;font-size:14px">${when}</td></tr>
            ${loc}
            <tr><td style="padding:4px 0;color:#5E617D;font-size:13px">Code</td><td style="padding:4px 0;color:#0C0C31;font-size:14px;letter-spacing:0.12em;font-family:monospace">${escapeHtml(i.ticketCode)}</td></tr>
          </table>
        </td></tr>
        <tr><td style="padding-top:22px">
          <a href="${escapeHtml(i.ticketUrl)}" style="display:inline-block;background:#3D46F2;color:#fff;text-decoration:none;font-weight:700;font-size:15px;padding:13px 22px;border-radius:8px">View my ticket and QR code</a>
        </td></tr>
        ${teamRegistration}
        <tr><td style="padding-top:24px;border-top:1px solid #ECEDF2">
          <div style="font-size:12px;color:#5E617D;margin-bottom:12px;line-height:1.5">You agreed to the following waiver and cancellation policy when you registered.</div>
          <div style="font-size:13px;font-weight:700;color:#0C0C31;margin-bottom:8px">Event Waiver</div>
          <div style="font-size:12px;color:#5E617D;line-height:1.6">
            By attending this ${CHAPTER_NAME} event, I confirm that my participation is voluntary. I understand that in-person events may involve certain risks, including injury, illness, property loss, or other unexpected situations. I agree not to hold ${CHAPTER_NAME}, Entrepreneurs&rsquo; Organization, event partners, sponsors, venue, vendors, staff, volunteers, or representatives responsible for any claims, loss, damage, injury, or illness related to my participation. I understand that photos, videos, and recordings may be taken and may be used by ${CHAPTER_NAME} and Entrepreneurs&rsquo; Organization for communication, marketing, social media, and promotional purposes.
          </div>
${i.nonRefundable
            ? `<div style="font-size:13px;font-weight:700;color:#0C0C31;margin-top:14px;margin-bottom:6px">Cancellation and Refunds</div>
          <div style="font-size:12px;color:#5E617D;line-height:1.6">
            All payments for this event are non-refundable. If you can no longer attend, please let the Chapter Manager know at ${CHAPTER_MANAGER_EMAIL}${MANAGER_WHATSAPP}.
          </div>`
            : `<div style="font-size:13px;font-weight:700;color:#0C0C31;margin-top:14px;margin-bottom:6px">Cancellation and Late Fee</div>
          <div style="font-size:12px;color:#5E617D;line-height:1.6">
            <strong>On-time cancellation:</strong> Notify the Chapter Manager at ${CHAPTER_MANAGER_EMAIL}${MANAGER_WHATSAPP} at least 48 hours before the event. No charge.<br><br>
            <strong>Late cancellation:</strong> Less than 48 hours&rsquo; notice — USD$100 per person. No-show (not attending without notice) — USD$${noShowFeeUsd} per person.<br><br>
            <strong>Fee waiver</strong> applies only for a death in the immediate family or a medical emergency with a doctor&rsquo;s certification, submitted within 1 week and approved by the Board/Chapter Manager. No exceptions for personal or business reasons.<br><br>
            Repeated non-compliance may result in restricted access to future events.
          </div>`}
        </td></tr>
        <tr><td style="padding-top:18px;color:#A6A9BD;font-size:12px">Keep this email to find your ticket again.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function formatEmailMoney(amount: number, currency: string): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
  }).format(toMajorUnits(amount, currency));
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

export type SapNominationEmailInput = {
  companyName: string;
  website: string | null;
  industry: string | null;
  motivation: string | null;
  contactNote: string | null;
  referredByName: string;
  referredByEmail: string;
  alreadyInPipeline: boolean;
};

// Best-effort notification to the SAP chair when a member suggests a partner.
// Like sendTicketEmail: dormant (returns false) until RESEND_API_KEY is set,
// and never throws — a mail failure must not break the submission.
export async function sendSapNominationEmail(
  input: SapNominationEmailInput,
): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: NOMINATION_TO,
      subject: `SAP suggestion: ${input.companyName}`,
      html: nominationEmailHtml(input),
    });
    if (error) {
      console.warn("sendSapNominationEmail:", error.message ?? String(error));
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      "sendSapNominationEmail threw:",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

// ── Chapter dues bank-transfer / VAT invoice notification ────────────────

const DUES_NOTIFY_TO =
  process.env.DUES_NOTIFY_EMAIL || CHAPTER_BOARD_EMAIL;

export type DuesBankTransferEmailInput = {
  memberName: string;
  representativeName: string;
  companyName: string;
  title: string;
  taxId: string;
  address: string;
  accountantEmail: string;
  accountantPhone: string;
  /** e.g. "FY 2026/2027 · $2,200", set by the page's open dues year */
  duesSummary?: string;
};

export async function sendDuesBankTransferEmail(
  input: DuesBankTransferEmailInput,
): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: DUES_NOTIFY_TO,
      replyTo: input.accountantEmail,
      subject: `Dues renewal (bank transfer): ${input.memberName} — ${input.companyName}`,
      html: duesBankTransferEmailHtml(input),
    });
    if (error) {
      console.warn("sendDuesBankTransferEmail:", error.message ?? String(error));
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      "sendDuesBankTransferEmail threw:",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

function duesBankTransferEmailHtml(i: DuesBankTransferEmailInput): string {
  const rows: Array<[string, string]> = [
    ["Member name", i.memberName],
    ["Representative", i.representativeName],
    ["Company", i.companyName],
    ["Title", i.title],
    ["Tax ID", i.taxId],
    ["Address", i.address],
    ["Accountant email", i.accountantEmail],
    ["Accountant phone", i.accountantPhone],
  ];
  const body = rows
    .map(
      ([k, v]) =>
        `<tr><td style="padding:6px 0;color:#5E617D;font-size:13px;width:140px;vertical-align:top">${escapeHtml(k)}</td>` +
        `<td style="padding:6px 0;color:#0C0C31;font-size:14px">${escapeHtml(v)}</td></tr>`,
    )
    .join("");
  return `<!doctype html><html><body style="margin:0;background:#F6F7FA;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7FA;padding:32px 16px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #ECEDF2;padding:28px">
        <tr><td style="font-size:13px;color:#3D46F2;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">${CHAPTER_NAME}</td></tr>
        <tr><td style="padding-top:10px;font-size:18px;font-weight:700;color:#0C0C31">Dues renewal — bank transfer &amp; VAT invoice request</td></tr>
        ${i.duesSummary ? `<tr><td style="padding-top:6px;font-size:14px;color:#5E617D">${escapeHtml(i.duesSummary)}</td></tr>` : ""}
        <tr><td style="padding-top:20px"><table cellpadding="0" cellspacing="0" width="100%">${body}</table></td></tr>
        <tr><td style="padding-top:20px;font-size:13px;color:#5E617D;line-height:1.6">
          Next step: send the member a contract and VAT invoice, then confirm bank transfer details.
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function nominationEmailHtml(i: SapNominationEmailInput): string {
  const rows: Array<[string, string | null]> = [
    ["Company", i.companyName],
    ["Website", i.website],
    ["Industry", i.industry],
    ["Why a fit", i.motivation],
    ["Contact there", i.contactNote],
    ["Suggested by", `${i.referredByName} (${i.referredByEmail})`],
  ];
  const body = rows
    .filter(([, v]) => Boolean(v))
    .map(
      ([k, v]) =>
        `<tr><td style="padding:5px 0;color:#5E617D;font-size:13px;width:120px;vertical-align:top">${escapeHtml(
          k,
        )}</td><td style="padding:5px 0;color:#0C0C31;font-size:14px">${escapeHtml(
          v as string,
        )}</td></tr>`,
    )
    .join("");
  const status = i.alreadyInPipeline
    ? "This company is already in the SAP pipeline. The referral was logged as a note; no existing deal was changed."
    : "Added to the pipeline as a new Lead.";
  return `<!doctype html><html><body style="margin:0;background:#F6F7FA;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7FA;padding:32px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #ECEDF2;padding:28px">
        <tr><td style="font-size:13px;color:#3D46F2;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">${CHAPTER_NAME}</td></tr>
        <tr><td style="padding-top:10px;font-size:18px;font-weight:700;color:#0C0C31">New Strategic Alliance Partner suggestion</td></tr>
        <tr><td style="padding-top:16px"><table cellpadding="0" cellspacing="0" width="100%">${body}</table></td></tr>
        <tr><td style="padding-top:16px;color:#5E617D;font-size:13px;line-height:1.5">${escapeHtml(status)} Open the SAP pipeline in the ${CHAPTER_NAME} admin to review it.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ── Member portal: Contact the Board + Directory Connect ─────────────────────

const BOARD_NOTIFY_TO = process.env.BOARD_NOTIFY_EMAIL || CHAPTER_BOARD_EMAIL;
const MARKETING_NOTIFY_TO =
  process.env.MARKETING_NOTIFY_EMAIL || CHAPTER_MARKETING_EMAIL;

export type BoardInquiryEmailInput = {
  fromName: string;
  fromEmail: string;
  subject: string;
  message: string;
};

// Best-effort notification to the board when a member submits an inquiry from
// /member/contact-board. Dormant (returns false) until RESEND_API_KEY is set,
// and never throws: the inquiry is already persisted before this is called.
export async function sendBoardInquiryEmail(
  input: BoardInquiryEmailInput,
): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: BOARD_NOTIFY_TO,
      replyTo: input.fromEmail,
      subject: `Member message to the board: ${input.subject}`,
      html: simpleMessageHtml(
        "New message to the board",
        `From ${input.fromName} (${input.fromEmail})`,
        input.subject,
        input.message,
      ),
    });
    if (error) {
      console.warn("sendBoardInquiryEmail:", error.message ?? String(error));
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      "sendBoardInquiryEmail threw:",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

// Best-effort staff alert when a Stripe payment cannot be matched to an event
// registration (see unmatched-payment-alert.ts). Dormant (returns false) until
// RESEND_API_KEY is set, and never throws.
export async function sendUnmatchedPaymentAlertEmail(message: string): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: BOARD_NOTIFY_TO,
      subject: "Action needed: Stripe payment without a registration",
      text: message,
    });
    if (error) {
      console.warn("sendUnmatchedPaymentAlertEmail:", error.message ?? String(error));
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      "sendUnmatchedPaymentAlertEmail threw:",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

export type MemberConnectEmailInput = {
  toEmail: string;
  toName: string;
  fromName: string;
  fromEmail: string;
  message: string;
};

// Intro-email for the directory Connect action: the requester never sees the
// target member's email. We send the intro to the target and set replyTo to the
// requester so the target can respond directly if they choose. Best-effort.
export async function sendMemberConnectEmail(
  input: MemberConnectEmailInput,
): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: input.toEmail,
      replyTo: input.fromEmail,
      subject: `${input.fromName} would like to connect with you on ${CHAPTER_NAME}`,
      html: simpleMessageHtml(
        "A fellow member wants to connect",
        `${input.fromName} found you in the ${CHAPTER_NAME} member directory and sent this note. Reply to this email to reach them directly.`,
        `Hi ${input.toName},`,
        input.message,
      ),
    });
    if (error) {
      console.warn("sendMemberConnectEmail:", error.message ?? String(error));
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      "sendMemberConnectEmail threw:",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

// ── Forum date set or changed (Plan 45) ──────────────────────────────────────
// The moderator saved a monthly forum date: each member of that forum gets a
// private email with the date and a calendar file. Sent one by one because
// each carries an attachment. Dormant until RESEND_API_KEY is set; never
// throws. Only ever pass the members of the one forum.

export type ForumDateEmailInput = {
  recipients: { email: string; name: string | null }[];
  forumName: string;
  month: string; // "March 2027"
  when: string; // "Fri 12 Mar 2027, 6:00 PM"
  place: string | null;
  pageUrl: string;
  ics: string;
};

export async function sendForumDateEmail(input: ForumDateEmailInput): Promise<number> {
  if (!resend) return 0;
  let sent = 0;
  for (const r of input.recipients) {
    try {
      const { error } = await resend.emails.send({
        from: FROM,
        to: r.email,
        subject: `Your forum date for ${input.month}`,
        html: simpleMessageHtml(
          `${input.forumName} forum`,
          "Your moderator set the forum date. Open the attached file to add it to your calendar.",
          r.name ? `Hi ${r.name},` : "Hi,",
          `${input.when}${input.place ? `\n${input.place}` : ""}\n\nAll your forum dates: ${input.pageUrl}`,
        ),
        attachments: [{ filename: "forum.ics", content: Buffer.from(input.ics) }],
      });
      if (error) console.warn("sendForumDateEmail:", error.message ?? String(error));
      else sent += 1;
    } catch (err) {
      console.warn("sendForumDateEmail threw:", err instanceof Error ? err.message : String(err));
    }
  }
  return sent;
}

// ── Event participant broadcast (Overview > Messages) ────────────────────────
// A chair messages everyone registered for an event: reminder, logistics
// update, survey nudge, thank-you. Each recipient gets a private To (no shared
// inbox), built in batches. Dormant (configured:false) until RESEND_API_KEY is
// set; never throws.

export type EventBroadcastRecipient = { email: string; name: string | null };

export type EventBroadcastInput = {
  subject: string;
  bodyText: string; // plain text authored by the chair; newlines preserved
  eventTitle: string;
  recipients: EventBroadcastRecipient[];
};

export type EventBroadcastResult = {
  configured: boolean;
  sent: number;
  failed: number;
};

export async function sendEventBroadcast(
  input: EventBroadcastInput,
): Promise<EventBroadcastResult> {
  if (!resend) return { configured: false, sent: 0, failed: 0 };
  if (input.recipients.length === 0) {
    return { configured: true, sent: 0, failed: 0 };
  }

  const messages = input.recipients.map((r) => ({
    from: FROM,
    to: r.email,
    subject: input.subject,
    html: broadcastHtml(input.eventTitle, r.name, input.bodyText),
  }));

  let sent = 0;
  let failed = 0;
  // Resend batch send accepts up to 100 messages per call.
  for (let i = 0; i < messages.length; i += 100) {
    const chunk = messages.slice(i, i + 100);
    try {
      const { error } = await resend.batch.send(chunk);
      if (error) {
        console.warn("sendEventBroadcast:", error.message ?? String(error));
        failed += chunk.length;
      } else {
        sent += chunk.length;
      }
    } catch (err) {
      console.warn(
        "sendEventBroadcast threw:",
        err instanceof Error ? err.message : String(err),
      );
      failed += chunk.length;
    }
  }
  return { configured: true, sent, failed };
}

function broadcastHtml(
  eventTitle: string,
  name: string | null,
  bodyText: string,
): string {
  const greeting = name ? `Hi ${escapeHtml(name)},` : "Hi,";
  const body = escapeHtml(bodyText);
  return `<!doctype html><html><body style="margin:0;background:#F6F7FA;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7FA;padding:32px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #ECEDF2;padding:28px">
        <tr><td style="font-size:13px;color:#3D46F2;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">${CHAPTER_NAME}</td></tr>
        <tr><td style="padding-top:10px;font-size:18px;font-weight:700;color:#0C0C31">${escapeHtml(eventTitle)}</td></tr>
        <tr><td style="padding-top:16px;color:#0C0C31;font-size:15px">${greeting}</td></tr>
        <tr><td style="padding-top:10px;color:#0C0C31;font-size:14px;line-height:1.6;white-space:pre-wrap">${body}</td></tr>
        <tr><td style="padding-top:22px;border-top:1px solid #ECEDF2;color:#A6A9BD;font-size:12px;line-height:1.5">You received this because you registered for this ${CHAPTER_NAME} event. Reply to this email if you no longer want event updates.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

function simpleMessageHtml(
  eyebrow: string,
  intro: string,
  heading: string,
  body: string,
): string {
  return `<!doctype html><html><body style="margin:0;background:#F6F7FA;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7FA;padding:32px 16px">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #ECEDF2;padding:28px">
        <tr><td style="font-size:13px;color:#3D46F2;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">${escapeHtml(eyebrow)}</td></tr>
        <tr><td style="padding-top:12px;color:#5E617D;font-size:13px;line-height:1.5">${escapeHtml(intro)}</td></tr>
        <tr><td style="padding-top:18px;font-size:16px;font-weight:700;color:#0C0C31">${escapeHtml(heading)}</td></tr>
        <tr><td style="padding-top:10px;color:#0C0C31;font-size:14px;line-height:1.6;white-space:pre-wrap">${escapeHtml(body)}</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

export type RecapReadyEmailInput = {
  eventTitle: string;
  recapUrl: string;
  postUrl: string;
  editUrl: string;
  statsIncluded: string[];
  statsSuppressed: { key: string; reason: string }[];
  testimonialCount: number;
};

// Tells marketing a recap went live. There is no approval step, so this is a
// notification and not a request: it carries what was published, what was held
// back and why, and a link to edit or unpublish.
//
// Best-effort like every other send here. A recap must still publish when
// Resend is unconfigured, so this returning false is not a failure.
export async function sendRecapReadyEmail(
  input: RecapReadyEmailInput,
): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: MARKETING_NOTIFY_TO,
      subject: `Recap published: ${input.eventTitle}`,
      html: recapReadyHtml(input),
    });
    if (error) {
      console.warn("sendRecapReadyEmail:", error.message ?? String(error));
      return false;
    }
    return true;
  } catch (err) {
    console.warn(
      "sendRecapReadyEmail threw:",
      err instanceof Error ? err.message : String(err),
    );
    return false;
  }
}

const STAT_LABELS: Record<string, string> = {
  attended: "Attendance",
  event_value_rating: "Event value rating",
  growth_rating: "Growth rating",
  companies: "Companies represented",
};

function statLabel(key: string): string {
  return STAT_LABELS[key] ?? key;
}

function recapReadyHtml(input: RecapReadyEmailInput): string {
  const included = input.statsIncluded.length
    ? input.statsIncluded.map((k) => `<li>${escapeHtml(statLabel(k))}</li>`).join("")
    : "<li>No stats met the publishing thresholds</li>";

  const suppressed = input.statsSuppressed.length
    ? input.statsSuppressed
        .map(
          (s) =>
            `<li><strong>${escapeHtml(statLabel(s.key))}</strong>: ${escapeHtml(s.reason)}</li>`,
        )
        .join("")
    : "<li>Nothing was held back</li>";

  const testimonials =
    input.testimonialCount === 0
      ? "No member quotes qualified for this event"
      : `${input.testimonialCount} member ${input.testimonialCount === 1 ? "quote" : "quotes"} included`;

  return `<!doctype html><html><body style="margin:0;background:#F6F7FA;font-family:Helvetica,Arial,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F6F7FA;padding:32px 16px">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#fff;border-radius:16px;border:1px solid #ECEDF2;padding:28px">
        <tr><td style="font-size:13px;color:#3D46F2;font-weight:700;letter-spacing:0.06em;text-transform:uppercase">Recap published</td></tr>
        <tr><td style="padding-top:12px;font-size:19px;font-weight:700;color:#0C0C31">${escapeHtml(input.eventTitle)}</td></tr>
        <tr><td style="padding-top:10px;color:#5E617D;font-size:13px;line-height:1.6">This recap is already live. No approval needed. If anything looks wrong, edit or unpublish it below.</td></tr>
        <tr><td style="padding-top:20px">
          <a href="${escapeHtml(input.recapUrl)}" style="display:inline-block;background:#3D46F2;color:#fff;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border-radius:8px">View the live recap</a>
          <a href="${escapeHtml(input.editUrl)}" style="display:inline-block;margin-left:8px;color:#3D46F2;text-decoration:none;font-weight:700;font-size:14px;padding:11px 20px;border:1px solid #3D46F2;border-radius:8px">Edit or unpublish</a>
        </td></tr>
        <tr><td style="padding-top:22px;font-size:14px;font-weight:700;color:#0C0C31">Published on the page</td></tr>
        <tr><td style="color:#0C0C31;font-size:13px;line-height:1.6"><ul style="margin:6px 0 0;padding-left:18px">${included}</ul></td></tr>
        <tr><td style="padding-top:16px;font-size:14px;font-weight:700;color:#0C0C31">Held back</td></tr>
        <tr><td style="color:#5E617D;font-size:13px;line-height:1.6"><ul style="margin:6px 0 0;padding-left:18px">${suppressed}</ul></td></tr>
        <tr><td style="padding-top:16px;font-size:14px;font-weight:700;color:#0C0C31">Member quotes</td></tr>
        <tr><td style="color:#0C0C31;font-size:13px;line-height:1.6">${escapeHtml(testimonials)}</td></tr>
        <tr><td style="padding-top:20px;color:#5E617D;font-size:12px;line-height:1.6">Written up from <a href="${escapeHtml(input.postUrl)}" style="color:#3D46F2">the blog post</a>.</td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`;
}

// ── Account invitation ───────────────────────────────────────────────────
// Sent by createUser() in auth.ts. The link is a one-time token on our own
// /auth/confirm route, which signs the person in and sends them to set a
// password. Returns false when email is not configured, so the caller can
// show the link to copy instead.

export type InviteEmailInput = { to: string; name: string; link: string };

export function renderInviteEmailHtml(i: InviteEmailInput): string {
  return `<div style="font-family:Roboto,Arial,sans-serif;max-width:520px;margin:0 auto;color:#0C0C31">
  <p style="font-size:15px">Hi ${escapeHtml(i.name)},</p>
  <p style="font-size:15px;line-height:1.55">You have been given an account on the ${escapeHtml(CHAPTER_NAME)} website. Open the link below to sign in and choose your password.</p>
  <p style="margin:24px 0"><a href="${escapeHtml(i.link)}" style="background:#3D46F2;color:#fff;text-decoration:none;font-weight:700;padding:12px 20px;border-radius:8px;display:inline-block">Set my password</a></p>
  <p style="font-size:13px;color:#5E617D;line-height:1.5">The link works once and expires after a day. If it has expired, use "Forgot password" on the sign-in page with this email address.</p>
</div>`;
}

export async function sendInviteEmail(input: InviteEmailInput): Promise<boolean> {
  if (!resend) return false;
  try {
    const { error } = await resend.emails.send({
      from: FROM,
      to: input.to,
      subject: `Your ${CHAPTER_NAME} account`,
      html: renderInviteEmailHtml(input),
    });
    if (error) {
      console.warn("sendInviteEmail:", error.message ?? String(error));
      return false;
    }
    return true;
  } catch (err) {
    console.warn("sendInviteEmail threw:", err instanceof Error ? err.message : String(err));
    return false;
  }
}
