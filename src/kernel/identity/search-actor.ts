// The chapter app's version of edge8-web's kernel/identity/search-actor.ts (EO-owned).
// Who is searching, on which surface. The chapter app has no client portal, so the
// portal arm keeps edge8's shape with a minimal actor and is never produced.
import type { AdminUser } from "./admin-auth";
import type { Access } from "./access-model";
import type { TeamActor } from "./team-auth";

export type SearchSurface = "admin" | "team" | "portal";

type PortalActor = { personId: string; email: string; companyScope: string[] };

type Permitted = { access: Pick<Access, "may"> };

export type SearchActor =
  | ({ surface: "admin"; admin: AdminUser } & Permitted)
  | ({ surface: "team"; team: TeamActor } & Permitted)
  | ({ surface: "portal"; portal: PortalActor } & Permitted);
