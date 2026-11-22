// Mounts edge8-web's board-digest routine (entities/boards/crons/board-digest). It refuses any
// request without the CRON_SECRET bearer and records each run in routine_runs.
export { GET } from "@/entities/boards/crons/board-digest";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

