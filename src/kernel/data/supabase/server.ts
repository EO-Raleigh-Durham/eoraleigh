// The chapter app's version of edge8-web's kernel/data/supabase/server.ts (EO-owned).
// The request's session client is EO's own, so the ported code reads the same
// sign-in as the rest of the site.
export { createSessionClient } from "@/lib/supabase-server";
