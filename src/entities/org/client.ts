// The chapter app's stand-in for edge8-web's org entity browser-safe door
// (EO-owned). ./index.ts pulls the service-role Supabase client, so a "use
// client" component may never import it; only constants and types live here.
export * from "./lib/company/edges-shared";
