"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import { getLiveGrant, recordNdaAcceptance } from "@/lib/access-grants-server";
import { CONTRACTOR_HOME, ndaAcceptanceError } from "@/lib/access-grants";

export type NdaResult = { ok: false; error: string };

// Records a contractor's NDA acceptance. Externally callable, so it re-checks
// the session, the role and the live grant before writing, and records only
// the caller's own grant.
export async function acceptNda(formData: FormData): Promise<NdaResult> {
  const user = await getSessionUser();
  if (!user) redirect("/admin/login");
  if (user.role !== "contractor") return { ok: false, error: "Only contractor accounts accept this agreement." };

  const grant = await getLiveGrant(user.id, "sap_pipeline");
  const input = {
    agreed: formData.get("agreed") === "on",
    name: String(formData.get("name") ?? ""),
    version: String(formData.get("version") ?? ""),
  };
  const error = ndaAcceptanceError(input, grant);
  if (error) return { ok: false, error };

  const h = await headers();
  const ip = h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip") || null;
  await recordNdaAcceptance(user.id, "sap_pipeline", {
    version: input.version,
    name: input.name.trim().replace(/\s+/g, " "),
    ip,
  });
  redirect(CONTRACTOR_HOME);
}
