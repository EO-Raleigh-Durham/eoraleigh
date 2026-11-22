import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createInquiry } from "@/lib/inquiries";
import { validateInterest } from "@/lib/leadership-interest";
import { FIELD_MAX, checkLengths } from "@/lib/validation";
import { CHAPTER_CONTACT_EMAIL } from "@/kernel/config/chapter";

// POST /api/leadership-interest
// Interest list for Leadership in the AI Era while its date is unconfirmed.
// Stored as a 'contact' inquiry tagged payload.category = 'leadership_interest'
// (the board inbox only lists category 'board', so these stay separate).

type Body = {
  name?: string;
  email?: string;
  membership?: string;
  company?: string;
  role_in_company?: string;
  revenue_scale?: string;
  website?: string; // honeypot, real visitors leave it empty
};

export async function POST(request: NextRequest) {
  let body: Body;
  try {
    body = (await request.json()) as Body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
  }

  // Bots fill the hidden field. Pretend success so they do not retry.
  if (body.website && body.website.trim() !== "") {
    return NextResponse.json({ ok: true });
  }

  const result = validateInterest(body);
  if (!result.ok) {
    return NextResponse.json({ error: result.error }, { status: 400 });
  }
  const { name, email, membership, company, role_in_company, revenue_scale } = result.details;

  const tooLong = checkLengths([
    ["Name", name, FIELD_MAX.name],
    ["Email", email, FIELD_MAX.email],
    ["Company", company ?? "", FIELD_MAX.company],
  ]);
  if (tooLong) {
    return NextResponse.json({ error: tooLong }, { status: 400 });
  }

  try {
    await createInquiry({
      email,
      name,
      kind: "contact",
      payload: {
        category: "leadership_interest",
        event_slug: "leadership-ai-era-2026",
        company,
        membership,
        role_in_company,
        revenue_scale,
      },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("[/api/leadership-interest] failed:", err);
    return NextResponse.json(
      { error: `Could not save your details. Please email ${CHAPTER_CONTACT_EMAIL}.` },
      { status: 500 },
    );
  }
}
