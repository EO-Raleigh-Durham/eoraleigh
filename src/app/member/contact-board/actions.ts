"use server";

import { supabase } from "@/lib/supabase";
import { requireMemberOrAbove } from "@/lib/auth";
import { sendBoardInquiryEmail } from "@/lib/email";

// A member sends a message to the board. Persisted as an inquiry (kind
// 'contact', payload category 'board') so it shows in the board inbox at
// /board/inquiries, then a best-effort email notifies the board.
export async function submitBoardMessage(
  subject: string,
  message: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const user = await requireMemberOrAbove();

  const s = subject.trim();
  const m = message.trim();
  if (s.length < 3) return { ok: false, error: "Please add a subject." };
  if (m.length < 10) {
    return { ok: false, error: "Please write a little more (at least 10 characters)." };
  }
  if (m.length > 4000) return { ok: false, error: "Message is too long." };

  const { error } = await supabase.from("inquiries").insert({
    person_id: user.personId,
    kind: "contact",
    payload: {
      category: "board",
      from_name: user.fullName,
      from_email: user.email,
      subject: s,
      message: m,
    },
  });

  if (error) return { ok: false, error: "Something went wrong. Please try again." };

  await sendBoardInquiryEmail({
    fromName: user.fullName ?? user.email,
    fromEmail: user.email,
    subject: s,
    message: m,
  });

  return { ok: true };
}
