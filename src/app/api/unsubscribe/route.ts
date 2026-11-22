// Mounts edge8-web's one-click unsubscribe endpoint (entities/site/api/unsubscribe):
// the List-Unsubscribe-Post target in every marketing email and the button on
// /unsubscribe. Public by design; the signed token is the authorization.
export { POST } from "@/entities/site/api/unsubscribe/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
