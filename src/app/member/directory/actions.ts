"use server";

import { supabase } from "@/lib/supabase";
import { requireMemberOrAbove } from "@/lib/auth";
import { sendMemberConnectEmail } from "@/lib/email";

// Directory "Connect" action. The requester never sees the target member's
// email: we look it up server-side, send an intro-email (best-effort, dormant
// until Resend is configured), and always log the request as an inquiry so the
// staff can follow up even when email is off. Returns a friendly result.
export async function connectWithMember(
  targetPersonId: string,
  message: string,
): Promise<{ ok: true; emailed: boolean } | { ok: false; error: string }> {
  const user = await requireMemberOrAbove();

  const note = message.trim();
  if (note.length < 5) {
    return { ok: false, error: "Please write a short message (at least 5 characters)." };
  }
  if (note.length > 2000) {
    return { ok: false, error: "Message is too long." };
  }
  if (!targetPersonId || targetPersonId === user.personId) {
    return { ok: false, error: "Invalid member." };
  }

  const { data: target, error: targetErr } = await supabase
    .from("people")
    .select("id, name, preferred_name, email")
    .eq("id", targetPersonId)
    .maybeSingle();

  if (targetErr || !target) {
    return { ok: false, error: "We could not find that member." };
  }
  const t = target as {
    id: string;
    name: string | null;
    preferred_name: string | null;
    email: string | null;
  };

  // Log the request regardless of email delivery (audit + staff fallback).
  await supabase.from("inquiries").insert({
    person_id: user.personId,
    kind: "contact",
    payload: {
      category: "member_connect",
      from_name: user.fullName,
      from_email: user.email,
      target_person_id: t.id,
      target_name: t.preferred_name ?? t.name,
      message: note,
    },
  });

  let emailed = false;
  if (t.email) {
    emailed = await sendMemberConnectEmail({
      toEmail: t.email,
      toName: t.preferred_name ?? t.name ?? "there",
      fromName: user.fullName ?? user.email,
      fromEmail: user.email,
      message: note,
    });
  }

  return { ok: true, emailed };
}
