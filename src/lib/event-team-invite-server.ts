import "server-only";

import { CHAPTER_SITE_URL } from "@/kernel/config/chapter";
import { supabase } from "@/lib/supabase";
import { SITE_URL } from "@/lib/page-metadata";
import {
  calculateVoucherPrice,
  normalizeVoucherCode,
  resolveSingleActiveVoucherTicketId,
} from "@/lib/event-vouchers";
import {
  buildTeamRegistrationUrl,
  canOfferTeamRegistration,
  type TeamInviteSource,
} from "@/lib/event-team-invites";

export type TeamRegistrationOffer = {
  url: string;
  voucherCode: string;
  percentOff: number;
  discountedUnitAmount: number;
  currency: string;
  ticketTypeId: string;
};

export type TeamRegistrationRate = Omit<TeamRegistrationOffer, "url">;

export async function getVoucherLandingTicketId(
  eventId: string,
  codeRaw: string,
): Promise<string | null> {
  const code = normalizeVoucherCode(codeRaw);
  if (!eventId || !code) return null;

  const { data: voucher, error: voucherError } = await supabase
    .from("event_vouchers")
    .select("id, starts_at, ends_at")
    .eq("event_id", eventId)
    .eq("code", code)
    .eq("active", true)
    .maybeSingle();
  if (voucherError || !voucher) return null;

  const now = Date.now();
  if (
    (voucher.starts_at && now < new Date(voucher.starts_at).getTime()) ||
    (voucher.ends_at && now >= new Date(voucher.ends_at).getTime())
  ) return null;

  const { data: eligibility, error: eligibilityError } = await supabase
    .from("event_voucher_ticket_types")
    .select("ticket_type_id")
    .eq("voucher_id", voucher.id);
  if (eligibilityError || !eligibility?.length) return null;

  const eligibleTicketTypeIds = eligibility.map((row) => row.ticket_type_id);
  const { data: activeTickets, error: ticketError } = await supabase
    .from("event_ticket_types")
    .select("id")
    .eq("event_id", eventId)
    .eq("active", true)
    .in("id", eligibleTicketTypeIds);
  if (ticketError || !activeTickets) return null;

  return resolveSingleActiveVoucherTicketId(
    eligibleTicketTypeIds,
    activeTickets.map((ticket) => ticket.id),
  );
}

type OfferInput = {
  eventId: string;
  eventPublicPath: string;
  inviterTicketCode: string;
  source: TeamInviteSource;
  origin?: string;
};

export async function getTeamRegistrationOffer(
  input: OfferInput,
): Promise<TeamRegistrationOffer | null> {
  if (!canOfferTeamRegistration(input.source)) return null;

  const rate = await getActiveTeamRegistrationRate(input.eventId);
  if (!rate) return null;

  const relativeUrl = buildTeamRegistrationUrl(input.eventPublicPath, {
    voucherCode: rate.voucherCode,
    ticketTypeId: rate.ticketTypeId,
    inviterTicketCode: input.inviterTicketCode,
  });
  const origin = input.origin || CHAPTER_SITE_URL || SITE_URL;

  return {
    ...rate,
    url: new URL(relativeUrl, origin).toString(),
  };
}

export async function getActiveTeamRegistrationRate(
  eventId: string,
): Promise<TeamRegistrationRate | null> {
  const { data: voucher, error: voucherError } = await supabase
    .from("event_vouchers")
    .select("id, code, discount_percent, starts_at, ends_at")
    .eq("event_id", eventId)
    .eq("team_invite_enabled", true)
    .eq("active", true)
    .maybeSingle();
  if (voucherError || !voucher) return null;
  const now = Date.now();
  if (
    (voucher.starts_at && now < new Date(voucher.starts_at).getTime()) ||
    (voucher.ends_at && now >= new Date(voucher.ends_at).getTime())
  ) return null;

  const { data: eligibility, error: eligibilityError } = await supabase
    .from("event_voucher_ticket_types")
    .select("ticket_type_id")
    .eq("voucher_id", voucher.id)
    .maybeSingle();
  if (eligibilityError || !eligibility) return null;

  const { data: ticket, error: ticketError } = await supabase
    .from("event_ticket_types")
    .select("id, price_amount, currency, active")
    .eq("id", eligibility.ticket_type_id)
    .eq("event_id", eventId)
    .eq("active", true)
    .maybeSingle();
  if (ticketError || !ticket) return null;

  const price = calculateVoucherPrice({
    code: voucher.code,
    percentOff: voucher.discount_percent,
    ticketTypeId: ticket.id,
    unitPrice: ticket.price_amount,
    quantity: 1,
    currency: ticket.currency,
    voucherId: voucher.id,
  });
  if (!price.ok) return null;

  return {
    voucherCode: voucher.code,
    percentOff: voucher.discount_percent,
    discountedUnitAmount: price.finalTotal,
    currency: price.currency,
    ticketTypeId: ticket.id,
  };
}
