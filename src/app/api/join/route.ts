import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createApplication } from "@/lib/applications";
import { coerceAttribution } from "@/lib/attribution";
import { FIELD_MAX, checkLengths } from "@/lib/validation";
import { looksLikeBot } from "@/lib/spam-guard";
import { missingJoinFields } from "@/lib/join-fields";
import { CHAPTER_CONTACT_EMAIL } from "@/kernel/config/chapter";

// POST /api/join
// Receives the membership application form from /join, and the shorter
// expression-of-interest form on the /founders landing pages (kind "interest",
// which has no "why" question).

type Body = {
  name?: string;
  email?: string;
  phone?: string;
  city?: string;
  company?: string;
  role?: string;
  industry?: string;
  revenue?: string;
  why?: string;
  kind?: string;
  attribution?: unknown;
  company_url?: unknown;
  elapsedMs?: unknown;
};

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

  // Required-field check
  const isInterest = body.kind === "interest";
  const missing = missingJoinFields(body, isInterest);
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
    ["Phone", body.phone?.trim() ?? "", FIELD_MAX.phone],
    ["City", body.city?.trim() ?? "", FIELD_MAX.city],
    ["Company", body.company!.trim(), FIELD_MAX.company],
    ["Role", body.role!.trim(), FIELD_MAX.role],
    ["Industry", body.industry?.trim() ?? "", FIELD_MAX.industry],
    ["Revenue", body.revenue?.trim() ?? "", FIELD_MAX.revenue],
    ["Why", body.why?.trim() ?? "", FIELD_MAX.longText],
  ]);
  if (tooLong) {
    return NextResponse.json({ error: tooLong }, { status: 400 });
  }

  try {
    const result = await createApplication({
      name: body.name!.trim(),
      email: body.email!.trim(),
      phone: body.phone?.trim(),
      city: body.city?.trim(),
      company: body.company!.trim(),
      role: body.role!,
      industry: body.industry?.trim(),
      revenue: body.revenue,
      why: body.why?.trim(),
      notes: isInterest ? "Expressed interest on a /founders landing page; no application yet." : undefined,
      attribution: coerceAttribution(body.attribution),
    });
    return NextResponse.json({ ok: true, applicationId: result.applicationId });
  } catch (err) {
    console.error("[/api/join] failed:", err);
    return NextResponse.json(
      { error: `Could not save application. Please email ${CHAPTER_CONTACT_EMAIL}.` },
      { status: 500 }
    );
  }
}
