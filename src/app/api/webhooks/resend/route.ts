// Mounts edge8-web's Resend webhook (entities/company-os/api/webhooks/resend):
// delivery, open, click, bounce and complaint events for marketing email, into
// email_events. Public by design; every request must carry a valid Svix
// signature made with RESEND_WEBHOOK_SECRET.
export { POST } from "@/entities/company-os/api/webhooks/resend/route";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
