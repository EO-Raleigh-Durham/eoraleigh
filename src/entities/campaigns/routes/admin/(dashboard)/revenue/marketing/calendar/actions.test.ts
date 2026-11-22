import { companyOs } from "@/kernel/data/supabase";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { builderFor, calls, resetFake, script } from "@/kernel/data/testing/fake-company-os";

// Characterisation tests for the two AI drafting actions. They existed as two
// byte-identical copies of the style-field build and the email-broadcast sync;
// these tests pin the exact update payloads, the insert rows and the
// success/failure messages so the extraction into shared helpers cannot drift.
//
// The fake Supabase client is the kernel's house fake
// (kernel/data/testing/fake-company-os.ts): `companyOs.from(table)` returns a
// chainable builder resolving to the next scripted response for that table,
// recording its operations and the rows it writes, and throwing on a query no
// test scripted.

vi.mock("@/kernel/data/supabase", () => ({
  companyOs: { from: (table: string) => builderFor(table) },
  supabase: { from: (table: string) => builderFor(table) },
  htt: { from: (table: string) => builderFor(table) },
}));

vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
// The actions ask for their declared permission first (ADR 0013); recorded so the test pins which.
const asked: string[] = [];
vi.mock("@/kernel/identity/access-request", () => ({
  requirePermission: async (p: string) => (asked.push(p), { user: { email: "admin@example.com" } }),
}));
vi.mock("@/kernel/audit/audit", () => ({ recordAudit: vi.fn(async () => {}) }));
vi.mock("@/entities/campaigns/lib/broadcasts", () => ({
  getBroadcastStats: vi.fn(async () => null),
}));
vi.mock("@/entities/campaigns/lib/ai/brand-writer", () => ({
  writeForBrand: vi.fn(),
  fetchSourceText: vi.fn(async () => "source text"),
}));
vi.mock("@/entities/campaigns/lib/ai/brand-image", () => ({
  generateEntryImage: vi.fn(),
}));
vi.mock("@/entities/campaigns/lib/marketing-images", () => ({
  listAssetImages: vi.fn(),
  setSelectedImage: vi.fn(),
}));
vi.mock("@/entities/campaigns/lib/blog-publish", () => ({
  publishBlogAsset: vi.fn(),
  revalidateBlog: vi.fn(),
  channelChangeRefusal: vi.fn(async () => null),
}));

// The live-edit rule (Y.91) runs for real; its outside world is the fake's.
vi.mock("@/entities/campaigns/lib/brand-profiles", async () => (await import("@/entities/campaigns/lib/testing/live-post-fake")).brandProfilesFake);
vi.mock("@/kernel/approvals/waiting", async () => (await import("@/entities/campaigns/lib/testing/live-post-fake")).waitingFake);
import { LIVE_POST, liveGate, resetLiveGate, scriptLivePost } from "@/entities/campaigns/lib/testing/live-post-fake";
import { blogVersion } from "@/entities/campaigns/lib/blog-version";

const listEntries = vi.fn(async () => ({ rows: [] as unknown[] }));
vi.mock("@/entities/campaigns/lib/marketing-calendar", async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    listEntries: (...args: unknown[]) => listEntries(...(args as [])),
  };
});

import { writeForBrand } from "@/entities/campaigns/lib/ai/brand-writer";
import { channelChangeRefusal, publishBlogAsset } from "@/entities/campaigns/lib/blog-publish";
import { draftCampaignAssets, draftWithAI, markPosted, moveEntry, publishBlogEntry, updateEntry } from "./actions";

const only = (table: string) => calls.filter((c) => c.table === table);
/** The object handed to `.update(...)` on the nth builder for that table. */
// The fake keeps each write's row in `payloads`, in write order.
const writeRow = (verb: "insert" | "update", table: string, n: number) => {
  const record = only(table)[n];
  const writes = record.ops.filter((op) => op === "insert" || op === "update" || op === "upsert");
  return record.payloads[writes.indexOf(verb)];
};
const updatePayload = (table: string, n = 0) => writeRow("update", table, n);
const insertPayload = (table: string, n = 0) => writeRow("insert", table, n);

const blogOutput = {
  channel: "blog" as const,
  title: "Blog title",
  bodyMd: "# body",
  blogStyle: "listicle",
  seoMd: "seo",
  socialStyle: "ignored-on-blog",
  imageStyle: "photo",
  imageBriefMd: "brief",
};

const emailOutput = {
  channel: "email" as const,
  title: "Email title",
  subject: " Subject ",
  preheader: " Preheader ",
  bodyMd: "email body",
  imageStyle: "photo",
};

beforeEach(() => {
  resetFake();
  resetLiveGate();
  listEntries.mockClear();
  listEntries.mockResolvedValue({ rows: [] });
  vi.mocked(writeForBrand).mockReset();
  vi.useFakeTimers();
  vi.setSystemTime(new Date("2026-09-06T12:00:00.000Z"));
});
afterEach(() => {
  vi.useRealTimers();
  vi.clearAllMocks();
});

describe("draftWithAI", () => {
  const entry = {
    id: "entry-1",
    title: "Entry title",
    brand_id: "brand-1",
    channel: "blog",
    publish_date: "2026-09-10",
    asset_url: null,
    posted_url: null,
    broadcast_id: null,
  };

  it("refuses an entry with no brand", async () => {
    script("marketing_content", { data: { ...entry, brand_id: null } });
    expect(await draftWithAI("entry-1")).toEqual({
      ok: false,
      error: "Set a brand on this entry first, so the writer knows the voice.",
    });
    expect(new Set(asked)).toEqual(new Set(["campaigns.marketing"]));
  });

  // The blog write asks the live-edit rule (Y.91) first: one read of the post.
  const notLive = { data: { channel: "blog", status: "drafted", campaign_id: null } };

  it("writes the full style-field set onto the entry for its own channel", async () => {
    script("marketing_content", { data: entry }, { data: [] }, notLive, {});
    vi.mocked(writeForBrand).mockResolvedValue({ ok: true, outputs: [blogOutput] });

    expect(await draftWithAI("entry-1")).toEqual({ ok: true, entries: [] });

    // Blog keeps blog_style and seo_md and drops social_style; image fields
    // apply to every channel.
    expect(updatePayload("marketing_content", 3)).toEqual({
      copy_md: "# body",
      image_style: "photo",
      image_brief_md: "brief",
      blog_style: "listicle",
      seo_md: "seo",
    });
  });

  it("creates a child entry for a foreign channel, staggered by the derivative offset", async () => {
    script(
      "marketing_content",
      { data: entry },
      { data: [] },
      { data: { id: "child-1" } },
    );
    vi.mocked(writeForBrand).mockResolvedValue({
      ok: true,
      outputs: [{ channel: "linkedin", bodyMd: "post", socialStyle: "hot-take", imageStyle: "photo" }],
    });

    await draftWithAI("entry-1");

    expect(insertPayload("marketing_content", 2)).toEqual({
      title: "Entry title",
      brand_id: "brand-1",
      channel: "linkedin",
      status: "drafted",
      publish_date: "2026-09-11",
      parent_id: "entry-1",
      created_by: "admin@example.com",
      copy_md: "post",
      image_style: "photo",
      social_style: "hot-take",
    });
  });

  it("reports the channels that failed to save without aborting the run", async () => {
    script(
      "marketing_content",
      { data: entry },
      { data: [] },
      notLive,
      { error: { message: "boom" } },
    );
    vi.mocked(writeForBrand).mockResolvedValue({ ok: true, outputs: [blogOutput] });

    expect(await draftWithAI("entry-1")).toEqual({
      ok: false,
      error: "Drafted, but these did not save: blog. Try again.",
    });
  });
});

describe("draftCampaignAssets", () => {
  const campaign = {
    id: "camp-1",
    name: "Campaign name",
    idea: "the idea",
    objective: "the objective",
    brand_id: "brand-1",
    pillar_id: "pillar-1",
    starts_on: "2026-09-10",
  };

  it("refuses a campaign with no brand or no idea", async () => {
    script("marketing_campaigns", { data: { ...campaign, brand_id: null } });
    expect(await draftCampaignAssets("camp-1")).toEqual({
      ok: false,
      error: "Set a brand on this campaign first, so the writer knows the voice and channels.",
    });

    resetFake();
    script("marketing_campaigns", { data: { ...campaign, idea: "  " } });
    expect(await draftCampaignAssets("camp-1")).toEqual({
      ok: false,
      error: "Write the campaign idea first; it is the brief the writer works from.",
    });
  });

  it("inserts a blog asset anchored on the campaign start date with the same style fields", async () => {
    script("marketing_campaigns", { data: campaign });
    script("marketing_content", { data: [] }, { data: { id: "asset-1" } });
    vi.mocked(writeForBrand).mockResolvedValue({ ok: true, outputs: [blogOutput] });

    expect(await draftCampaignAssets("camp-1")).toEqual({ ok: true, channels: ["blog"] });

    expect(insertPayload("marketing_content", 1)).toEqual({
      title: "Blog title",
      brand_id: "brand-1",
      pillar_id: "pillar-1",
      campaign_id: "camp-1",
      channel: "blog",
      status: "drafted",
      publish_date: "2026-09-10",
      created_by: "admin@example.com",
      copy_md: "# body",
      image_style: "photo",
      image_brief_md: "brief",
      blog_style: "listicle",
      seo_md: "seo",
    });
  });

  it("reports partially saved channels", async () => {
    script("marketing_campaigns", { data: campaign });
    script("marketing_content", { data: [{ id: "asset-1", channel: "blog", broadcast_id: null }] }, { data: { channel: "blog", status: "drafted", campaign_id: "camp-1" } }, { error: { message: "boom" } });
    vi.mocked(writeForBrand).mockResolvedValue({ ok: true, outputs: [blogOutput] });

    expect(await draftCampaignAssets("camp-1")).toEqual({
      ok: false,
      error: "Drafted, but these did not save: blog. Try again.",
    });
  });
});

// W.118.4. The live link is drawn as "View live" in the entry drawer and in the
// campaign log, so a value that is not a link is refused, never stored.
describe("markPosted", () => {
  it("stores the live link through externalHref, and allows none", async () => {
    script("marketing_content", { data: [{ id: "m1" }] }, { data: [{ id: "m1" }] });
    expect(await markPosted("m1", " linkedin.com/posts/edge8-1 ")).toEqual({ ok: true });
    expect(await markPosted("m1", "")).toEqual({ ok: true });
    expect([updatePayload("marketing_content", 0), updatePayload("marketing_content", 1)]).toEqual([
      { status: "published", posted_url: "https://linkedin.com/posts/edge8-1" },
      { status: "published", posted_url: null },
    ]);
  });

  it("refuses a value that is not a link, and writes nothing", async () => {
    for (const bad of ["javascript:alert(1)", "posted on Friday"]) {
      expect(await markPosted("m1", bad)).toEqual({
        ok: false,
        error: "The live link isn't a web link. Paste the post's full address.",
      });
    }
    expect(only("marketing_content")).toHaveLength(0);
  });
});

// The re-review of #1988, race 5: the calendar cannot put a blog live without
// the publish gate, by dragging it to Published or by Mark posted.
describe("a blog goes live only through the gate", () => {
  it("routes a blog dragged to Published through publishBlogAsset, writing no status itself", async () => {
    vi.mocked(publishBlogAsset).mockResolvedValue({ ok: false, errors: ["This post waits on its Publish approval: read it and press Publish on the campaign hub."] });
    script("marketing_content", { data: { channel: "blog", status: "approved", slug: null } });
    expect(await moveEntry("b1", "published")).toEqual({ ok: false, error: expect.stringMatching(/press Publish on the campaign hub/) });
    expect(publishBlogAsset).toHaveBeenCalledWith("b1", "admin@example.com");
    expect(only("marketing_content").some((c) => c.ops.includes("update"))).toBe(false);
  });

  it("moves a social post to Published as before", async () => {
    vi.mocked(publishBlogAsset).mockClear();
    script("marketing_content", { data: { channel: "linkedin", status: "approved", slug: null } }, { error: null });
    expect(await moveEntry("l1", "published")).toEqual({ ok: true });
    expect(publishBlogAsset).not.toHaveBeenCalled();
  });

  // The final Opus pass: no blog -> LinkedIn -> Mark posted -> blog side door.
  it("refuses a channel change the guard refuses, writing nothing", async () => {
    vi.mocked(channelChangeRefusal).mockResolvedValueOnce("An entry that belongs to a campaign keeps its channel; add a new entry for another channel.");
    expect(await updateEntry("b1", { channel: "linkedin" })).toEqual({ ok: false, error: expect.stringMatching(/keeps its channel/) });
    expect(channelChangeRefusal).toHaveBeenCalledWith("b1", "linkedin");
    expect(only("marketing_content")).toHaveLength(0);
  });

  it("refuses Mark posted on a blog: its update matches no blog row", async () => {
    script("marketing_content", { data: [] });
    expect(await markPosted("b1", "https://example.com/post/x")).toEqual({ ok: false, error: expect.stringMatching(/only through Publish to site/) });
    expect(only("marketing_content")[0].filters).toContainEqual(["neq", "channel", "blog"]);
  });
});

// The Opus review of #1988, finding 2: the calendar's Publish goes through the
// same approval gate as every other publish, and says why it refused.
describe("publishBlogEntry", () => {
  it("shows the approval gate's refusal to the person who pressed Publish", async () => {
    vi.mocked(publishBlogAsset).mockResolvedValue({ ok: false, errors: ["This post changed after its Publish approval, so it is not published. Ask for approval again on the campaign hub."] });
    expect(await publishBlogEntry("asset-1")).toEqual({
      ok: false,
      error: "This post changed after its Publish approval, so it is not published. Ask for approval again on the campaign hub.",
    });
  });
});

// Y.91: a post live on a campaign that publishes on approval keeps its
// version. The rule itself is pinned in lib/blog-live-edit.test.ts; here, that
// the calendar's three writers of a post's copy ask it and show its answer.
describe("a live post on a gated campaign keeps its version", () => {
  const approved = () => ({ state: "approved", metadata: { version: blogVersion({ title: LIVE_POST.title, copyMd: LIVE_POST.copy_md, seoMd: LIVE_POST.seo_md, imageUrl: LIVE_POST.image_url, publishDate: LIVE_POST.publish_date }) } });
  const writesTo = (table: string) => only(table).filter((c) => c.ops.includes("update") || c.ops.includes("insert"));

  it("updateEntry refuses an edit of its copy, title, SEO plan or date, writing nothing", async () => {
    for (const patch of [{ copyMd: "Body, edited." }, { title: "A new title" }, { seoMd: "slug: new" }, { publishDate: "2026-10-20" }]) {
      liveGate.latest = approved();
      scriptLivePost();
      expect(await updateEntry("blog-1", patch)).toEqual({ ok: false, error: expect.stringMatching(/This post is live and its campaign publishes on approval.*unpublish it first/) });
    }
    expect(writesTo("marketing_content")).toEqual([]);
  });

  it("updateEntry saves a drawer save that leaves the version as it is", async () => {
    liveGate.latest = approved();
    scriptLivePost();
    script("marketing_content", { error: null });
    const { title, copy_md, seo_md, publish_date } = LIVE_POST;
    expect(await updateEntry("blog-1", { title, copyMd: copy_md, seoMd: seo_md, publishDate: publish_date, notes: "A note." })).toEqual({ ok: true });
    expect(updatePayload("marketing_content", 1)).toMatchObject({ notes: "A note.", copy_md: "Body." });
  });

  it("updateEntry edits a live post of an auto-publish brand, or of no campaign, as before", async () => {
    liveGate.latest = approved();
    liveGate.autoPublishBrands.add("brand-1");
    scriptLivePost();
    script("marketing_content", { error: null });
    expect(await updateEntry("blog-1", { copyMd: "Body, edited." })).toEqual({ ok: true });
    liveGate.autoPublishBrands.clear();
    scriptLivePost({ campaign_id: null });
    script("marketing_content", { error: null });
    expect(await updateEntry("blog-1", { copyMd: "Body, edited." })).toEqual({ ok: true });
    expect(writesTo("marketing_content")).toHaveLength(2);
  });

  it("updateEntry refuses when the campaign cannot be read", async () => {
    script("marketing_content", { data: LIVE_POST });
    script("marketing_campaigns", { error: { message: "timeout" } });
    expect(await updateEntry("blog-1", { copyMd: "Body, edited." })).toEqual({ ok: false, error: expect.stringMatching(/campaign could not be read, so the edit was not saved/) });
    expect(writesTo("marketing_content")).toEqual([]);
  });

  it("Draft with AI on the calendar leaves the live post as it is and says why", async () => {
    liveGate.latest = approved();
    script("marketing_content", { data: { id: "blog-1", title: "How to delegate", brand_id: "brand-1", channel: "blog", publish_date: "2026-10-09", asset_url: null, posted_url: null, broadcast_id: null } }, { data: [] });
    scriptLivePost();
    vi.mocked(writeForBrand).mockResolvedValue({ ok: true, outputs: [blogOutput] });
    expect(await draftWithAI("blog-1")).toEqual({ ok: false, error: expect.stringMatching(/did not save: blog \(This post is live and its campaign publishes on approval/) });
    expect(writesTo("marketing_content")).toEqual([]);
  });

  it("Draft with AI on the hub leaves the campaign's live post as it is and says why", async () => {
    liveGate.latest = approved();
    script("marketing_campaigns", { data: { id: "c-1", name: "Campaign", idea: "the idea", objective: null, brand_id: "brand-1", pillar_id: null, starts_on: "2026-10-09" } });
    script("marketing_content", { data: [{ id: "blog-1", channel: "blog", broadcast_id: null }] });
    scriptLivePost();
    vi.mocked(writeForBrand).mockResolvedValue({ ok: true, outputs: [blogOutput] });
    expect(await draftCampaignAssets("c-1")).toEqual({ ok: false, error: expect.stringMatching(/did not save: blog \(This post is live/) });
    expect(writesTo("marketing_content")).toEqual([]);
  });
});
