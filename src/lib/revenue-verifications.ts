import { supabase } from "./supabase";
import { resolvePublicPerson } from "./public-person";
import {
  REVENUE_VERIFICATION_BUCKET,
  contentTypeFor,
  storagePath,
} from "./revenue-verification-files";

// Server-only helper for recording revenue-verification submissions from
// /revenue-verification. Supabase is the source of truth for both the row and
// the uploaded files (private storage bucket); the Lark Drive upload is
// layered on top and is allowed to fail without losing either.

export type RevenueVerificationInput = {
  email: string;
  verificationType?: string | null;
  grossRevenue?: string | null;
  fiscalYearEnd?: string | null;
  entityType?: string | null;
  ownershipPct?: string | null;
  signature?: string | null;
  printedName?: string | null;
  association?: string | null;
  formDate?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  stateRegion?: string | null;
  zipCode?: string | null;
  fileNames: string[];
  filePaths: string[];
};

export type RevenueVerificationResult = {
  id: string;
  personId: string;
};

const orNull = (v?: string | null) => {
  const t = v?.trim();
  return t ? t : null;
};

export async function createRevenueVerification(
  input: RevenueVerificationInput,
): Promise<RevenueVerificationResult> {
  if (!input.email) throw new Error("createRevenueVerification: email is required");

  const person = await resolvePublicPerson({
    email: input.email,
    name: orNull(input.printedName),
    phone: orNull(input.phone),
    city: orNull(input.city),
  });

  const { data, error } = await supabase
    .from("revenue_verifications")
    .insert({
      person_id: person.id,
      email: input.email.trim(),
      verification_type: orNull(input.verificationType),
      gross_revenue: orNull(input.grossRevenue),
      fiscal_year_end: orNull(input.fiscalYearEnd),
      entity_type: orNull(input.entityType),
      ownership_pct: orNull(input.ownershipPct),
      signature: orNull(input.signature),
      printed_name: orNull(input.printedName),
      association: orNull(input.association),
      form_date: orNull(input.formDate),
      phone: orNull(input.phone),
      address: orNull(input.address),
      city: orNull(input.city),
      state_region: orNull(input.stateRegion),
      zip_code: orNull(input.zipCode),
      file_names: input.fileNames,
      file_paths: input.filePaths,
      lark_status: "pending",
    })
    .select("id")
    .single();

  if (error) throw error;
  return { id: data.id as string, personId: person.id };
}

// Saves every uploaded file to the private bucket and returns the storage
// paths, in order. All or nothing: on any failure the files already saved are
// removed and the error is thrown, so the caller never records a submission
// whose documents are missing.
export async function saveVerificationFiles(
  files: { name: string; bytes: Uint8Array }[],
): Promise<string[]> {
  const folder = crypto.randomUUID();
  const paths: string[] = [];
  for (const [i, f] of files.entries()) {
    const path = storagePath(folder, i, f.name);
    const { error } = await supabase.storage
      .from(REVENUE_VERIFICATION_BUCKET)
      .upload(path, f.bytes, {
        contentType: contentTypeFor(f.name) ?? "application/octet-stream",
        upsert: false,
      });
    if (error) {
      await removeVerificationFiles(paths);
      throw new Error(`storage upload failed: ${error.message}`);
    }
    paths.push(path);
  }
  return paths;
}

// Best-effort cleanup of files whose submission could not be recorded.
export async function removeVerificationFiles(paths: string[]): Promise<void> {
  if (paths.length === 0) return;
  const { error } = await supabase.storage.from(REVENUE_VERIFICATION_BUCKET).remove(paths);
  if (error) console.warn("removeVerificationFiles:", error.message);
}

// Records the outcome of the Lark Drive push. Never throws on a logging miss.
export async function markLarkResult(
  id: string,
  result:
    | { status: "uploaded"; folderToken: string; folderUrl: string }
    | { status: "failed"; error: string },
): Promise<void> {
  const patch =
    result.status === "uploaded"
      ? {
          lark_status: "uploaded" as const,
          lark_folder_token: result.folderToken,
          lark_folder_url: result.folderUrl,
          lark_error: null,
        }
      : { lark_status: "failed" as const, lark_error: result.error.slice(0, 1000) };

  const { error } = await supabase.from("revenue_verifications").update(patch).eq("id", id);
  if (error) console.warn("markLarkResult:", error.message);
}
