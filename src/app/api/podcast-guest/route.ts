import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createInquiry } from "@/lib/inquiries";
import { FIELD_MAX, checkLengths } from "@/lib/validation";
import { looksLikeBot } from "@/lib/spam-guard";
import { CHAPTER_CONTACT_EMAIL } from "@/kernel/config/chapter";

// POST /api/podcast-guest
// Receives the "Apply to be a guest" form from /podcast.

type Body = {
  name?: string;
  email?: string;
  company?: string;
  revenue?: string;
  story?: string;
  company_url?: unknown;
  elapsedMs?: unknown;
};

const REQUIRED: (keyof Body)[] = ["name", "email", "story"];

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Spam control (lib/spam-guard): a bot gets the normal success answer and
  // nothing is saved.
  if (looksLikeBot({ honeypot: body.company_url, elapsedMs: body.elapsedMs })) {
    return NextResponse.json({ ok: true });
  }

  const missing = REQUIRED.filter((k) => !body[k] || String(body[k]).trim() === "");
  if (missing.length) {
    return NextResponse.json(
      { error: `Missing required fields: ${missing.join(", ")}` },
      { status: 400 }
    );
  }

  if (!isEmail(body.email!)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const tooLong = checkLengths([
    ["Name", body.name!.trim(), FIELD_MAX.name],
    ["Email", body.email!.trim(), FIELD_MAX.email],
    ["Company", body.company?.trim() ?? "", FIELD_MAX.company],
    ["Revenue", body.revenue?.trim() ?? "", FIELD_MAX.revenue],
    ["Story", body.story!.trim(), FIELD_MAX.longText],
  ]);
  if (tooLong) {
    return NextResponse.json({ error: tooLong }, { status: 400 });
  }

  try {
    const result = await createInquiry({
      email: body.email!.trim(),
      name: body.name!.trim(),
      kind: "podcast_guest",
      payload: {
        company: body.company?.trim() || null,
        revenue: body.revenue?.trim() || null,
        story: body.story!.trim(),
      },
    });
    return NextResponse.json({ ok: true, inquiryId: result.inquiryId });
  } catch (err) {
    console.error("[/api/podcast-guest] failed:", err);
    return NextResponse.json(
      { error: `Could not save inquiry. Please email ${CHAPTER_CONTACT_EMAIL}.` },
      { status: 500 }
    );
  }
}
