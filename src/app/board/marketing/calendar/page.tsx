import "./calendar.css";
import { listPublishedSitePosts } from "@/lib/site-posts";
import { MarketingCalendar } from "@/entities/campaigns/routes/admin/(dashboard)/revenue/marketing/calendar/page";

// Mounts edge8-web's Marketing System calendar at its chapter path, adding
// the posts already published on the site as read-only Published cards.
export { metadata } from "@/entities/campaigns/routes/admin/(dashboard)/revenue/marketing/calendar/page";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

export default async function Page() {
  return <MarketingCalendar sitePosts={await listPublishedSitePosts()} />;
}
