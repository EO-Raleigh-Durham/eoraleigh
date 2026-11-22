// Mounts edge8-web's weekly-sprints routine (entities/boards/crons/weekly-sprints). It refuses any
// request without the CRON_SECRET bearer and records each run in routine_runs.
export { GET } from "@/entities/boards/crons/weekly-sprints";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;
