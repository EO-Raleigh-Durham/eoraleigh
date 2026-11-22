// Which ported edge8 entities listen to which domain events (EO-owned; edge8-web
// has app/events.ts with its full entity list). Registered once per server
// process by src/instrumentation.ts. The registry lives on globalThis
// (kernel/events/bus.ts) because Next bundles instrumentation separately from
// the routes and server actions that publish.
import { resetSubscribers } from "@/kernel/events";
import { subscriptions as boardsSubscriptions } from "@/entities/boards";
import { subscriptions as campaignsSubscriptions } from "@/entities/campaigns";

let registered = false;

/** Idempotent: Next may evaluate a module more than once per process. */
export function registerEventSubscribers(): void {
  if (registered) return;
  registered = true;
  resetSubscribers();
  boardsSubscriptions();
  campaignsSubscriptions();
}
