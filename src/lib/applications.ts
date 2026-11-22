import { supabase } from "./supabase";
import { resolvePublicPerson } from "./public-person";
import { deriveChannelSource, type Attribution } from "./attribution";

// Server-only helper for creating a membership application.
// Wires together /join form submissions to people + applications tables.

export type ApplicationInput = {
  // Person fields
  name: string;
  email: string;
  phone?: string;
  city?: string;
  // Application fields
  company: string;
  role: string;
  industry?: string;
  revenue?: string;
  why?: string;
  // Staff-facing note, e.g. marking an expression of interest.
  notes?: string;
  // First-touch marketing attribution captured at the form (optional).
  attribution?: Attribution | null;
};

export type ApplicationResult = {
  applicationId: string;
  personId: string;
};

export async function createApplication(
  input: ApplicationInput
): Promise<ApplicationResult> {
  if (!input.email || !input.name) {
    throw new Error("createApplication: name and email are required");
  }

  const person = await resolvePublicPerson({
    email: input.email,
    name: input.name,
    phone: input.phone,
    city: input.city,
  });

  const { data, error } = await supabase
    .from("applications")
    .insert({
      person_id: person.id,
      company: input.company.trim(),
      role: input.role,
      industry: input.industry?.trim() || null,
      revenue_bucket: input.revenue || null,
      why: input.why?.trim() || null,
      notes: input.notes ?? null,
    })
    .select("id")
    .single();

  if (error) throw error;
  const applicationId = data.id as string;

  // First-touch attribution is stored best-effort so a missing-column
  // (migration 028 not yet applied to a drifted prod) never blocks an
  // application from saving. The base insert above is the source of truth.
  if (input.attribution) {
    const channelSource = deriveChannelSource(input.attribution);

    const { error: appAttrErr } = await supabase
      .from("applications")
      .update({
        channel_source: channelSource,
        utm_source: input.attribution.utm_source,
        utm_medium: input.attribution.utm_medium,
        utm_campaign: input.attribution.utm_campaign,
        utm_content: input.attribution.utm_content,
        utm_term: input.attribution.utm_term,
        referrer: input.attribution.referrer,
        landing_path: input.attribution.landing_path,
      })
      .eq("id", applicationId);
    if (appAttrErr) {
      console.warn("application attribution not stored (migration pending?):", appAttrErr.message);
    }

    // A public submission must not update a canonical person that already
    // matched by primary or alternate email. New people may still receive
    // the first-touch value; the application row above retains attribution
    // for every submission.
    if (person.mode === "created") {
      const { error: personAttrErr } = await supabase
        .from("people")
        .update({ channel_source: channelSource })
        .eq("id", person.id)
        .is("channel_source", null);
      if (personAttrErr) {
        console.warn("person channel_source not stored (migration pending?):", personAttrErr.message);
      }
    }
  }

  return { applicationId, personId: person.id };
}
