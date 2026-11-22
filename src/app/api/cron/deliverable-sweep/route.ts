// Mounts edge8-web's deliverable-sweep routine (entities/boards/crons/deliverable-sweep). It refuses any
// request without the CRON_SECRET bearer and records each run in routine_runs.
export { GET } from "@/entities/boards/crons/deliverable-sweep";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";
export const maxDuration = 60;
