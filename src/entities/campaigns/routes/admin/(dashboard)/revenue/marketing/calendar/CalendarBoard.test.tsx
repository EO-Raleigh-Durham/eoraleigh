import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { CalendarBoard } from "./CalendarBoard";
import type { CalendarEntryRow } from "@/entities/campaigns/lib/marketing-calendar-shared";

// W.103.11: the no-wrap contract for this board lives entirely in CSS hung off
// `.cal-board`, so the one thing code can get wrong — and the one thing worth
// pinning — is whether that class still reaches the board element. A test that
// asserted a flex-wrap value would be pinning the stylesheet through a render
// that never reads it; this asserts the seam the stylesheet depends on.

const entry = {
  id: "e1",
  title: "Launch note",
  status: "draft",
  channel: "blog",
  parentId: null,
  brandName: null,
  pillarName: null,
  broadcastStatus: null,
  publishDate: null,
} as unknown as CalendarEntryRow;

describe("the marketing calendar board", () => {
  it("carries its own board class, so the no-wrap rules can find it", () => {
    const html = renderToStaticMarkup(
      <CalendarBoard entries={[entry]} onMove={() => {}} onCardClick={() => {}} />,
    );
    expect(html).toContain('class="admin-kanban cal-board"');
  });
});
