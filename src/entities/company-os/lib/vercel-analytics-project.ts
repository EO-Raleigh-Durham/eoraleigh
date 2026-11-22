// The chapter app's version of edge8-web's vercel-analytics-project.ts (EO-owned):
// the Vercel project whose Web Analytics the marketing overview and the weekly
// pulse read: the chapter site's. Both ids come from the environment
// (VERCEL_ANALYTICS_TEAM_ID, VERCEL_ANALYTICS_PROJECT_ID); with either unset
// there is no project and the analytics panels say so.
const teamId = (process.env.VERCEL_ANALYTICS_TEAM_ID ?? "").trim();
const projectId = (process.env.VERCEL_ANALYTICS_PROJECT_ID ?? "").trim();

export const VERCEL_ANALYTICS_PROJECT: { teamId: string; projectId: string } | null =
  teamId && projectId ? { teamId, projectId } : null;
