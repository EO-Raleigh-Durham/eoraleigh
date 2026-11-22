// Mounts edge8-web's revenue-closed-cards routine (entities/boards/crons/revenue-closed-cards). It refuses any
// request without the CRON_SECRET bearer and records each run in routine_runs.
export { GET } from "@/entities/boards/crons/revenue-closed-cards";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;
