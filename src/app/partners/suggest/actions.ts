"use server";

import { revalidatePath } from "next/cache";
import { resolvePublicPerson } from "@/lib/public-person";
import { submitSapNomination } from "@/lib/sap";
import { sendSapNominationEmail } from "@/lib/email";

// Public server action for the member "suggest a Strategic Alliance Partner"
// form at /partners/suggest. This route is NOT under /admin, so it is not
// behind the admin basic-auth gate (src/proxy.ts) — it is meant to be public.

export type SuggestResult = { ok: true } | { ok: false; error: string };

function s(v: FormDataEntryValue | null): string {
  return typeof v === "string" ? v.trim() : "";
}

function nullable(v: string): string | null {
  return v === "" ? null : v;
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function submitPartnerSuggestion(
  formData: FormData,
): Promise<SuggestResult> {
  // Honeypot: a hidden field people never see. If it is filled, it is a bot —
  // pretend success and write nothing.
  if (s(formData.get("company_url"))) return { ok: true };

  const yourName = s(formData.get("your_name"));
  const yourEmail = s(formData.get("your_email")).toLowerCase();
  const companyName = s(formData.get("company_name"));
  const website = s(formData.get("website"));
  const industry = s(formData.get("industry"));
  const motivation = s(formData.get("motivation"));
  const contact = s(formData.get("contact_there"));

  if (!yourName) return { ok: false, error: "Please add your name" };
  if (!EMAIL_RE.test(yourEmail)) {
    return { ok: false, error: "Please add a valid email" };
  }
  if (!companyName) return { ok: false, error: "Please add the company name" };
  if (!motivation) {
    return {
      ok: false,
      error: "Please tell us why they would be a good partner",
    };
  }

  try {
    // Link the referring member (matched/created by email).
    const person = await resolvePublicPerson({ email: yourEmail, name: yourName });

    const res = await submitSapNomination({
      companyName,
      website: nullable(website),
      industry: nullable(industry),
      motivation: nullable(motivation),
      contactNote: nullable(contact),
      referredByPersonId: person.id,
      referredByName: yourName,
    });

    // Best-effort notification to the SAP chair. Never blocks the submission
    // and is a no-op until Resend is configured.
    await sendSapNominationEmail({
      companyName,
      website: nullable(website),
      industry: nullable(industry),
      motivation: nullable(motivation),
      contactNote: nullable(contact),
      referredByName: yourName,
      referredByEmail: yourEmail,
      alreadyInPipeline: res.alreadyInPipeline,
    });

    revalidatePath("/board/strategic-alliance-partners");
    return { ok: true };
  } catch (err) {
    console.warn(
      "submitPartnerSuggestion:",
      err instanceof Error ? err.message : String(err),
    );
    return { ok: false, error: "Something went wrong. Please try again." };
  }
}
