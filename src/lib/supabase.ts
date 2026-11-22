import { createClient } from "@supabase/supabase-js";

// Server-only Supabase client for the chapter's dedicated project.
// Uses the secret key, which bypasses RLS. NEVER import from a client component.

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseSecretKey = process.env.SUPABASE_SECRET_KEY;

if (!supabaseUrl || !supabaseSecretKey) {
  // This module is pulled into the client bundle whenever a client component
  // value-imports from a lib that imports it (label maps, date formatters).
  // The secret env vars are server-only and never exist in the browser, so the
  // guard MUST run server-side only: otherwise it throws at module evaluation
  // and crashes every such page in the browser, even though the browser never
  // actually uses this client. The build phase is also exempt so `next build`
  // can compile without secrets present.
  const isBuildPhase = process.env.NEXT_PHASE === "phase-production-build";
  const isServer = typeof window === "undefined";
  if (isServer && process.env.NODE_ENV === "production" && !isBuildPhase) {
    throw new Error(
      "Supabase env vars missing (SUPABASE_URL / SUPABASE_SECRET_KEY). Set them in the deployment environment."
    );
  }
  if (isServer) {
    console.warn(
      "Supabase env vars not configured (SUPABASE_URL / SUPABASE_SECRET_KEY). Database features will not work."
    );
  }
}

export const supabase = createClient(
  supabaseUrl || "https://placeholder.supabase.co",
  supabaseSecretKey || "placeholder-key",
  {
    auth: { persistSession: false },
  }
);
