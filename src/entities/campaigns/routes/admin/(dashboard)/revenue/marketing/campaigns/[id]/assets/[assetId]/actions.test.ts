import { beforeEach, describe, expect, it, vi } from "vitest";
import { calls, fakeSupabase, resetFake, script } from "@/kernel/data/testing/fake-company-os";

// Y.91: the asset page's copy editor saves through the live-edit rule. A post
// live on a campaign that publishes on approval keeps its copy and the page
// says how to change it; an auto-publish brand's post, a post with no
// campaign and a post with no approval history save as before; a failed read
// refuses. The rule's own cases are in lib/blog-live-edit.test.ts.

vi.mock("@/kernel/data/supabase", () => fakeSupabase());
vi.mock("next/cache", () => ({ revalidatePath: vi.fn(), revalidateTag: vi.fn() }));
vi.mock("@/kernel/identity/access-request", () => ({ requirePermission: async () => ({ user: { email: "admin@example.com" } }) }));
const audits = vi.hoisted(() => [] as unknown[]);
vi.mock("@/kernel/audit/audit", () => ({ recordAudit: vi.fn(async (a: unknown) => void audits.push(a)) }));
vi.mock("@/entities/campaigns/lib/markdown", () => ({ marketingMarkdownToHtml: async (md: string) => `<p>${md}</p>` }));
vi.mock("@/entities/campaigns/lib/ai/brand-image", () => ({ generateEntryImage: vi.fn(), buildEntryImagePrompt: vi.fn() }));
vi.mock("@/entities/campaigns/lib/ai/entry-copy", () => ({ generateEntryCopy: vi.fn(), buildEntryCopyPrompt: vi.fn() }));
vi.mock("@/entities/campaigns/lib/brand-profiles", async () => (await import("@/entities/campaigns/lib/testing/live-post-fake")).brandProfilesFake);
vi.mock("@/kernel/approvals/waiting", async () => (await import("@/entities/campaigns/lib/testing/live-post-fake")).waitingFake);

const { saveAssetCopy } = await import("./actions");
const { blogVersion } = await import("@/entities/campaigns/lib/blog-version");
const { LIVE_POST, liveGate, resetLiveGate, scriptLivePost } = await import("@/entities/campaigns/lib/testing/live-post-fake");

const approved = () => ({
  state: "approved",
  metadata: { version: blogVersion({ title: LIVE_POST.title, copyMd: LIVE_POST.copy_md, seoMd: LIVE_POST.seo_md, imageUrl: LIVE_POST.image_url, publishDate: LIVE_POST.publish_date }) },
});
const updates = () => calls.filter((c) => c.table === "marketing_content" && c.ops.includes("update"));

beforeEach(() => {
  resetFake();
  resetLiveGate();
  audits.length = 0;
});

describe("saveAssetCopy", () => {
  it("refuses an edit of a live post on a gated campaign, writing and auditing nothing", async () => {
    liveGate.latest = approved();
    scriptLivePost();
    expect(await saveAssetCopy("c-1", "blog-1", "Body, edited.")).toEqual({
      ok: false,
      error: expect.stringMatching(/This post is live and its campaign publishes on approval.*unpublish it first.*Ask for approval on the campaign hub and Publish/),
    });
    expect(updates()).toEqual([]);
    expect(audits).toEqual([]);
  });

  it("saves a live post of an auto-publish brand, of no campaign, and of a campaign with no approval history", async () => {
    liveGate.latest = approved();
    liveGate.autoPublishBrands.add("brand-1");
    scriptLivePost();
    script("marketing_content", { error: null });
    expect(await saveAssetCopy("c-1", "blog-1", "Body, edited.")).toEqual({ ok: true, html: "<p>Body, edited.</p>" });

    resetLiveGate();
    liveGate.latest = approved();
    scriptLivePost({ campaign_id: null });
    script("marketing_content", { error: null });
    expect(await saveAssetCopy("c-1", "blog-1", "Body, edited again.")).toMatchObject({ ok: true });

    liveGate.latest = null;
    scriptLivePost();
    script("marketing_content", { error: null });
    expect(await saveAssetCopy("c-1", "blog-1", "Body, edited a third time.")).toMatchObject({ ok: true });
    expect(updates().map((c) => c.payloads[0])).toEqual([{ copy_md: "Body, edited." }, { copy_md: "Body, edited again." }, { copy_md: "Body, edited a third time." }]);
  });

  it("saves a post that is not live yet", async () => {
    liveGate.latest = approved();
    scriptLivePost({ status: "approved" });
    script("marketing_content", { error: null });
    expect(await saveAssetCopy("c-1", "blog-1", "Body, edited.")).toMatchObject({ ok: true });
  });

  it("refuses when the post cannot be read", async () => {
    script("marketing_content", { error: { message: "timeout" } });
    expect(await saveAssetCopy("c-1", "blog-1", "Body, edited.")).toEqual({ ok: false, error: expect.stringMatching(/The post could not be read, so the edit was not saved/) });
    expect(updates()).toEqual([]);
  });
});
