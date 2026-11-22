import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  createRevenueVerification,
  markLarkResult,
  removeVerificationFiles,
  saveVerificationFiles,
} from "@/lib/revenue-verifications";
import { validateFiles } from "@/lib/revenue-verification-files";
import { larkConfigured, uploadSubmission, type LarkFileInput } from "@/lib/lark-drive";
import { FIELD_MAX, checkLengths } from "@/lib/validation";
import { CHAPTER_CONTACT_EMAIL } from "@/kernel/config/chapter";

// POST /api/revenue-verification
// Receives the multipart "Revenue Verification" form from
// /revenue-verification: text fields + one or more uploaded statements.
//
// Flow: validate -> save the files to the private storage bucket -> save the
// row with their storage paths (Supabase is the source of truth for both) ->
// copy the files into a per-submission Lark Drive folder. If the files or the
// row cannot be saved the member gets an error, never a success. A Lark
// failure does NOT fail the request; the row is marked lark_status='failed'
// for retry, and the member still gets a success response because the row and
// the files are safely stored.

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SAVE_FAILED = `Could not save your submission. Please email ${CHAPTER_CONTACT_EMAIL}.`;

function isEmail(s: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
}

function str(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

export async function POST(request: NextRequest) {
  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return NextResponse.json({ error: "Expected multipart form data" }, { status: 400 });
  }

  // Honeypot: the real form never sends "website". Bots that fill every field
  // do. Pretend success so they do not retry.
  if (str(form.get("website"))) {
    return NextResponse.json({ ok: true });
  }

  const email = str(form.get("email"));
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }
  if (!isEmail(email)) {
    return NextResponse.json({ error: "Invalid email" }, { status: 400 });
  }

  const fields = {
    verificationType: str(form.get("verification_type")),
    grossRevenue: str(form.get("gross_revenue")),
    fiscalYearEnd: str(form.get("fiscal_year_end")),
    entityType: str(form.get("entity_type")),
    ownershipPct: str(form.get("ownership_pct")),
    signature: str(form.get("signature")),
    printedName: str(form.get("printed_name")),
    association: str(form.get("association")),
    formDate: str(form.get("form_date")),
    phone: str(form.get("phone")),
    address: str(form.get("address")),
    city: str(form.get("city")),
    stateRegion: str(form.get("state_region")),
    zipCode: str(form.get("zip_code")),
  };

  const tooLong = checkLengths([
    ["Email", email, FIELD_MAX.email],
    ["Gross revenue", fields.grossRevenue, FIELD_MAX.revenue],
    ["Entity type", fields.entityType, FIELD_MAX.shortText],
    ["Printed name", fields.printedName, FIELD_MAX.name],
    ["Signature", fields.signature, FIELD_MAX.name],
    ["Association", fields.association, FIELD_MAX.shortText],
    ["Phone", fields.phone, FIELD_MAX.phone],
    ["Address", fields.address, FIELD_MAX.shortText],
    ["City", fields.city, FIELD_MAX.city],
    ["State/Region", fields.stateRegion, FIELD_MAX.city],
    ["Zip code", fields.zipCode, FIELD_MAX.phone],
  ]);
  if (tooLong) {
    return NextResponse.json({ error: tooLong }, { status: 400 });
  }

  // Collect uploaded files.
  const rawFiles = form.getAll("files").filter((f): f is File => f instanceof File && f.size > 0);
  const fileError = validateFiles(rawFiles);
  if (fileError) {
    return NextResponse.json({ error: fileError }, { status: 400 });
  }

  const larkFiles: LarkFileInput[] = [];
  for (const f of rawFiles) {
    const buf = new Uint8Array(await f.arrayBuffer());
    larkFiles.push({ name: f.name, bytes: buf });
  }
  const fileNames = larkFiles.map((f) => f.name);

  // 1) Keep the files: private storage bucket. No files kept, no success.
  let filePaths: string[];
  try {
    filePaths = await saveVerificationFiles(larkFiles);
  } catch (err) {
    console.error("[/api/revenue-verification] file save failed:", err);
    return NextResponse.json({ error: SAVE_FAILED }, { status: 500 });
  }

  // 2) Source of truth: the Supabase row, pointing at the stored files.
  let recordId: string;
  try {
    const result = await createRevenueVerification({ email, ...fields, fileNames, filePaths });
    recordId = result.id;
  } catch (err) {
    console.error("[/api/revenue-verification] db save failed:", err);
    await removeVerificationFiles(filePaths);
    return NextResponse.json({ error: SAVE_FAILED }, { status: 500 });
  }

  // 3) Best-effort: copy to Lark Drive. Never fails the request.
  let larkOk = false;
  if (larkConfigured()) {
    const datePart = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
    const label = fields.printedName || email;
    const folderName = `${label} (${datePart})`;
    try {
      const up = await uploadSubmission(folderName, larkFiles);
      await markLarkResult(recordId, {
        status: "uploaded",
        folderToken: up.folderToken,
        folderUrl: up.folderUrl,
      });
      larkOk = true;
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[/api/revenue-verification] lark upload failed:", msg);
      await markLarkResult(recordId, { status: "failed", error: msg });
    }
  } else {
    console.warn("[/api/revenue-verification] Lark not configured; skipping Drive upload.");
    await markLarkResult(recordId, { status: "failed", error: "Lark not configured" });
  }

  return NextResponse.json({ ok: true, id: recordId, larkUploaded: larkOk });
}
