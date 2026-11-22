// Mounts edge8-web's revenue-content-sync routine (entities/campaigns/crons/revenue-content-sync):
// the marketing calendar and writer runs, kept in step with the Marketing
// workboard's cards. It refuses any request without the CRON_SECRET bearer and
// records each run in routine_runs.
export { GET } from "@/entities/campaigns/crons/revenue-content-sync";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;
