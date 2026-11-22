// The chapter app's stand-in for edge8-web's crm browser-safe door (EO-owned).
// ./index.ts pulls the service-role Supabase client, so a "use client"
// component may never import it. The person picker is what the goals and
// radar screens render to choose a board member.
export { PersonSelect } from "./ui/PersonSelect";
export type { PersonOption } from "./lib/people-options";
