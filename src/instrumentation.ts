// Next.js calls register() once per server process before serving requests.
// It wires the edge8 port's event subscribers (src/app/events.ts).
export async function register(): Promise<void> {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerEventSubscribers } = await import("@/app/events");
    registerEventSubscribers();
  }
}
