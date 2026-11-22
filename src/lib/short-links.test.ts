import assert from "node:assert/strict";
import test from "node:test";
import {
  PLACEMENTS,
  SHORT_CODE_RE,
  buildCustomSpec,
  buildPlacementSpec,
  blogPostPages,
  buildShortLinkDestination,
  dedupeLinkablePages,
  describePlacement,
  humanizePath,
  isInternalPath,
  normalizeShortCode,
  placementByKey,
  placementForLink,
  slugPart,
  type ShortLinkTarget,
} from "./short-links.ts";

const BASE: ShortLinkTarget = {
  target_path: "/events/eo-rise-4",
  utm_source: "whatsapp",
  utm_medium: "social",
  utm_campaign: "decisionlab",
  utm_content: "official-group",
  utm_term: null,
};

test("codes are trimmed, lowercased and validated", () => {
  assert.equal(normalizeShortCode(" DL17-WA-OF "), "dl17-wa-of");
  assert.equal(normalizeShortCode("dl17"), "dl17");
  assert.equal(normalizeShortCode(""), null);
  assert.equal(normalizeShortCode("a"), null);
  assert.equal(normalizeShortCode("-starts-with-hyphen"), null);
  assert.equal(normalizeShortCode("has space"), null);
  assert.equal(normalizeShortCode("has/slash"), null);
  assert.equal(normalizeShortCode("x".repeat(41)), null);
  assert.equal(normalizeShortCode(null), null);
});

test("the destination carries the stored tags", () => {
  assert.equal(
    buildShortLinkDestination("https://chapter.example.org", BASE),
    "https://chapter.example.org/events/eo-rise-4?utm_source=whatsapp&utm_medium=social&utm_campaign=decisionlab&utm_content=official-group",
  );
});

test("unset tags are left off the destination", () => {
  assert.equal(
    buildShortLinkDestination("https://chapter.example.org", {
      target_path: "/join",
      utm_source: "facebook",
      utm_medium: null,
      utm_campaign: null,
      utm_content: null,
      utm_term: null,
    }),
    "https://chapter.example.org/join?utm_source=facebook",
  );
});

test("a target that is not site-relative falls back to /events", () => {
  assert.equal(
    buildShortLinkDestination("https://chapter.example.org", {
      ...BASE,
      target_path: "https://evil.example.com/",
    }),
    "https://chapter.example.org/events?utm_source=whatsapp&utm_medium=social&utm_campaign=decisionlab&utm_content=official-group",
  );
});

test("a protocol-relative target falls back to /events", () => {
  const url = buildShortLinkDestination("https://chapter.example.org", {
    ...BASE,
    target_path: "//evil.example.com/x",
  });
  assert.equal(new URL(url).origin, "https://chapter.example.org");
  assert.equal(new URL(url).pathname, "/events");
});

test("a backslash target cannot leave the site", () => {
  // Browsers read "/\\host" as "//host", so new URL() resolves it off-site.
  for (const target_path of [
    "/\\evil.example.com",
    "/\\/evil.example.com",
    "/events\\..\\..\\evil.example.com",
    "/\t/evil.example.com",
    "/\n/evil.example.com",
    "\\\\evil.example.com",
  ]) {
    const url = new URL(
      buildShortLinkDestination("https://chapter.example.org", { ...BASE, target_path }),
    );
    assert.equal(url.origin, "https://chapter.example.org", target_path);
    assert.equal(url.pathname, "/events", target_path);
  }
});

test("isInternalPath accepts pages on the site and nothing else", () => {
  for (const path of ["/", "/join", "/events/eo-rise-4?rsvp_ticket=guest", "/post/a#top"]) {
    assert.equal(isInternalPath(path), true, path);
  }
  for (const path of [
    "",
    "join",
    "//evil.example.com",
    "/\\evil.example.com",
    "https://evil.example.com/",
    "javascript:alert(1)",
    "/ok\\path",
    "/\t/evil.example.com",
  ]) {
    assert.equal(isInternalPath(path), false, JSON.stringify(path));
  }
});

test("a target with its own query keeps both sets of parameters", () => {
  const url = buildShortLinkDestination("https://chapter.example.org", {
    ...BASE,
    target_path: "/events/eo-rise-4?rsvp_ticket=guest",
  });
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get("rsvp_ticket"), "guest");
  assert.equal(parsed.searchParams.get("utm_source"), "whatsapp");
});

const DL = "/events/decisionlab-december-2026";

function spec(path: string, key: string, label?: string) {
  const placement = placementByKey(key);
  assert.ok(placement, `placement ${key}`);
  const result = buildPlacementSpec(path, placement, label);
  assert.ok(!("error" in result), "no error expected");
  return result as Exclude<typeof result, { error: string }>;
}

test("the WhatsApp Official placement builds the code and tags from the page alone", () => {
  const made = spec(DL, "wa-official");
  assert.equal(made.codeBase, "decisionlab-wa-of");
  assert.equal(made.target_path, DL);
  assert.equal(made.utm_source, "whatsapp");
  assert.equal(made.utm_medium, "social");
  assert.equal(made.utm_campaign, "decisionlab-december-2026");
  assert.equal(made.utm_content, "official-group");
});

test("every placement gives a valid code, even for a very long page name", () => {
  const long = "/events/a-very-long-event-name-that-goes-on-and-on-forever-2027";
  for (const placement of PLACEMENTS) {
    const result = buildPlacementSpec(long, placement, "founder-quote");
    assert.ok(!("error" in result));
    assert.match(result.codeBase, SHORT_CODE_RE);
    assert.ok(result.codeBase.length <= 40);
  }
});

test("the standard set is the five usual places and nothing else", () => {
  assert.deepEqual(
    PLACEMENTS.filter((p) => p.standard).map((p) => p.key),
    ["wa-official", "wa-social", "facebook", "linkedin", "instagram"],
  );
});

test("each placement gets its own code and its own post tag", () => {
  const standard = PLACEMENTS.filter((p) => p.standard);
  const made = standard.map((p) => buildPlacementSpec(DL, p) as { codeBase: string; utm_content: string; utm_source: string });
  assert.equal(new Set(made.map((m) => m.codeBase)).size, standard.length);
  const facebook = made.find((m) => m.utm_source === "facebook");
  const linkedin = made.find((m) => m.utm_source === "linkedin");
  assert.equal(facebook?.utm_content, "post");
  assert.equal(linkedin?.utm_content, "post");
  assert.notEqual(facebook?.codeBase, linkedin?.codeBase);
});

test("a post name makes a separate link for a second post", () => {
  const first = spec(DL, "facebook");
  const second = spec(DL, "facebook", "24 Nov");
  assert.notEqual(first.codeBase, second.codeBase);
  assert.equal(second.utm_content, "post-24-nov");
  assert.equal(second.codeBase, "decisionlab-fb-24-nov");
});

test("an ad needs a name, and the name goes in the tags and the code", () => {
  const placement = placementByKey("facebook-ad");
  assert.ok(placement);
  assert.deepEqual(buildPlacementSpec(DL, placement), {
    error: "Give the ad a short name, for example founder-quote",
  });
  const made = spec(DL, "facebook-ad", "Founder Quote");
  assert.equal(made.utm_medium, "paid_social");
  assert.equal(made.utm_content, "ad-founder-quote");
  assert.equal(made.codeBase, "decisionlab-fb-ad-founder-quote");
});

test("other pages work too, named after their last address segment", () => {
  const made = spec("/join", "wa-official");
  assert.equal(made.utm_campaign, "join");
  assert.equal(made.codeBase, "join-wa-of");
});

test("slugPart strips accents, symbols and edge hyphens", () => {
  assert.equal(slugPart("  Dà Lạt Retreat! "), "da-lat-retreat");
  assert.equal(slugPart("Résumé 24/11"), "resume-24-11");
  assert.equal(slugPart(null), "");
});

test("the links table describes each link in plain English", () => {
  assert.equal(
    describePlacement({ utm_source: "whatsapp", utm_medium: "social", utm_content: "official-group" }),
    "WhatsApp, Official group",
  );
  assert.equal(
    describePlacement({ utm_source: "facebook", utm_medium: "social", utm_content: "post-24-nov" }),
    "Facebook post: 24-nov",
  );
  assert.equal(
    describePlacement({ utm_source: "facebook", utm_medium: "paid_social", utm_content: "ad-founder-quote" }),
    "Facebook ad: founder-quote",
  );
  assert.equal(
    describePlacement({ utm_source: "youtube", utm_medium: "social", utm_content: "intro" }),
    "youtube, intro",
  );
});

test("the page list drops duplicate addresses and keeps the first", () => {
  assert.deepEqual(
    dedupeLinkablePages([
      { path: DL, title: "Pinned" },
      { path: "/events/eo-rise-4", title: "RISE 4" },
      { path: DL, title: "Database row" },
    ]),
    [
      { path: DL, title: "Pinned" },
      { path: "/events/eo-rise-4", title: "RISE 4" },
    ],
  );
});

test("every placement says where to paste it, and has a short name", () => {
  for (const placement of PLACEMENTS) {
    assert.ok(placement.hint.length > 10, `hint for ${placement.key}`);
    assert.ok(placement.label.length <= 28, `short label for ${placement.key}`);
    assert.ok(!/[()]/.test(placement.label), `no brackets in ${placement.key}`);
  }
});

test("a link belongs to its placement, with or without a post or ad name", () => {
  const key = (link: { utm_source: string; utm_medium: string; utm_content: string }) =>
    placementForLink(link)?.key ?? null;
  assert.equal(
    key({ utm_source: "whatsapp", utm_medium: "social", utm_content: "official-group" }),
    "wa-official",
  );
  assert.equal(
    key({ utm_source: "facebook", utm_medium: "social", utm_content: "post-reminder-1" }),
    "facebook",
  );
  assert.equal(
    key({ utm_source: "facebook", utm_medium: "paid_social", utm_content: "ad-a" }),
    "facebook-ad",
  );
  assert.equal(
    key({ utm_source: "youtube", utm_medium: "social", utm_content: "intro" }),
    null,
  );
});

test("a link made from a placement is recognised as that placement", () => {
  for (const placement of PLACEMENTS) {
    const made = buildPlacementSpec(DL, placement, "a");
    assert.ok(!("error" in made));
    assert.equal(placementForLink(made)?.key, placement.key);
  }
});

test("a page with no known title gets a readable name from its address", () => {
  assert.equal(
    humanizePath("/events/tenured-new-members-dinner-november-2026"),
    "Tenured new members dinner november 2026",
  );
  assert.equal(humanizePath("/join"), "Join");
  assert.equal(humanizePath("/events/eo-rise-4?x=1"), "Eo rise 4");
});

test("a place that is not in the list builds a link from the platform name", () => {
  const made = buildCustomSpec(DL, "YouTube", "Speaker intro");
  assert.ok(!("error" in made));
  assert.equal(made.utm_source, "youtube");
  assert.equal(made.utm_medium, "social");
  assert.equal(made.utm_campaign, "decisionlab-december-2026");
  assert.equal(made.utm_content, "speaker-intro");
  assert.equal(made.codeBase, "decisionlab-yt-speaker-intro");
  assert.match(made.codeBase, SHORT_CODE_RE);
});

test("a custom place with no post name uses the plain post tag", () => {
  const made = buildCustomSpec("/join", "Line group");
  assert.ok(!("error" in made));
  assert.equal(made.utm_content, "post");
  assert.equal(made.codeBase, "join-line-group");
});

test("a custom place needs a name", () => {
  assert.deepEqual(buildCustomSpec(DL, "  "), {
    error: "Name the platform or place the link will be posted",
  });
});

test("a custom link is described by its platform and post", () => {
  const made = buildCustomSpec(DL, "YouTube", "Speaker intro");
  assert.ok(!("error" in made));
  assert.equal(describePlacement(made), "youtube, speaker-intro");
});

test("a free-typed post name works for a listed place too", () => {
  const facebook = placementByKey("facebook");
  assert.ok(facebook);
  const made = buildPlacementSpec(DL, facebook, "Speaker Intro!");
  assert.ok(!("error" in made));
  assert.equal(made.utm_content, "post-speaker-intro");
  assert.equal(made.codeBase, "decisionlab-fb-speaker-intro");
});

test("a long custom platform name is cut at a hyphen, never mid-word", () => {
  const made = buildCustomSpec(DL, "a very long platform name for a group chat");
  assert.ok(!("error" in made));
  assert.match(made.codeBase, SHORT_CODE_RE);
  assert.ok(made.codeBase.length <= 40);
  assert.equal(made.codeBase, "decisionlab-a-very-long");
});

test("blog posts become /post/<slug> pages, newest first, each once", () => {
  const pages = blogPostPages([
    { slug: "older-post", title: "Older post", published_at: "2026-10-01" },
    { slug: "newer-post", title: "Newer post", published_at: "2026-11-06" },
    { slug: "older-post", title: "Older post (pinned copy)", published_at: "2026-10-01" },
    { slug: " ", title: "No slug", published_at: "2026-11-01" },
  ]);
  assert.deepEqual(
    pages.map((p) => p.path),
    ["/post/newer-post", "/post/older-post"],
  );
  assert.equal(pages[0].title, "Newer post");
  assert.equal(pages[0].startsAt, "2026-11-06");
});

test("a blog post link is tagged with the post's own name and opens /post/<slug>", () => {
  const facebook = placementByKey("facebook");
  assert.ok(facebook);
  const made = buildPlacementSpec("/post/every-half-and-gam-all-since-2021", facebook);
  assert.ok(!("error" in made));
  assert.equal(made.target_path, "/post/every-half-and-gam-all-since-2021");
  assert.equal(made.utm_campaign, "every-half-and-gam-all-since-2021");
  assert.equal(made.codeBase, "every-half-fb");
  assert.match(made.codeBase, SHORT_CODE_RE);
  assert.equal(
    buildShortLinkDestination("https://chapter.example.org", made),
    "https://chapter.example.org/post/every-half-and-gam-all-since-2021?utm_source=facebook&utm_medium=social&utm_campaign=every-half-and-gam-all-since-2021&utm_content=post",
  );
});
