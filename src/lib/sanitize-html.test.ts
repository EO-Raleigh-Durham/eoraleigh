import assert from "node:assert/strict";
import test from "node:test";
import { sanitizeHtml, sanitizeStyle } from "./sanitize-html.ts";

test("removes script tags together with their code", () => {
  const out = sanitizeHtml('<p>Hello</p><script>alert(1)</script><script src="https://evil.example/x.js"></script>');
  assert.equal(out, "<p>Hello</p>");
});

test("removes event handler attributes", () => {
  const out = sanitizeHtml('<img src="https://example.com/a.jpg" alt="A" onerror="alert(1)"><p onclick="alert(2)">Hi</p>');
  assert.equal(out, '<img src="https://example.com/a.jpg" alt="A"><p>Hi</p>');
});

test("removes javascript: and data: links but keeps the link text", () => {
  assert.equal(sanitizeHtml('<a href="javascript:alert(1)">Click</a>'), "<a>Click</a>");
  assert.equal(sanitizeHtml('<a href=" JaVaScRiPt:alert(1)">Click</a>'), "<a>Click</a>");
  assert.equal(sanitizeHtml('<a href="data:text/html,<script>alert(1)</script>">Click</a>'), "<a>Click</a>");
  assert.equal(sanitizeHtml('<img src="javascript:alert(1)" alt="x">'), '<img alt="x">');
});

test("keeps http, https, mailto and site-relative links", () => {
  const html =
    '<a href="https://example.com/a" target="_blank" rel="noopener">A</a>' +
    '<a href="http://example.com/b">B</a>' +
    '<a href="mailto:hello@chapter.example.org">C</a>' +
    '<a href="/events">D</a>';
  assert.equal(sanitizeHtml(html), html);
});

test("removes frames, forms, styles and embedded objects", () => {
  const out = sanitizeHtml(
    '<iframe src="https://evil.example"></iframe>' +
      '<iframe srcdoc="<script>alert(1)</script>"></iframe>' +
      "<style>body{display:none}</style>" +
      '<object data="x.swf"></object><embed src="x.swf">' +
      '<form action="https://evil.example"><button>Go</button></form>' +
      '<svg><foreignObject><script>alert(1)</script></foreignObject><use href="#x"></use></svg>' +
      "<p>Kept</p>",
  );
  assert.doesNotMatch(out, /iframe|style|object|embed|form|button|script|foreignObject|use|alert/i);
  assert.match(out, /<p>Kept<\/p>/);
});

test("a normal styled table renders unchanged", () => {
  const html =
    '<table class="nl-table" style="width:100%;border-collapse:collapse">' +
    "<tbody><tr>" +
    '<td style="padding:8px 12px;border:1px solid var(--border);font-weight:700">Date</td>' +
    '<td style="padding:8px 12px;border:1px solid var(--border)"><strong>12 Dec</strong><br><em>Lisbon</em></td>' +
    "</tr></tbody></table>";
  assert.equal(sanitizeHtml(html), html);
});

test("callout lists, figures and inline charts render unchanged", () => {
  const html =
    '<div class="blog-callout-box"><ul class="blog-callout-list"><li><span class="blog-li-bullet"></span><span>One</span></li></ul></div>' +
    '<figure role="img" aria-label="Chart" style="margin:36px 0">' +
    '<svg viewBox="0 0 760 400" width="100%" style="display:block">' +
    '<rect x="208" y="14" width="88" height="360" fill="var(--bg-alt)" stroke-opacity="0.5"></rect>' +
    '<text x="252" y="30" text-anchor="middle" font-size="12">2021</text>' +
    "</svg>" +
    '<figcaption style="font-size:13px">Source</figcaption></figure>';
  assert.equal(sanitizeHtml(html), html);
});

test("keeps a YouTube embed and a hosted video, nothing else in a frame", () => {
  const youtube =
    '<iframe src="https://www.youtube-nocookie.com/embed/bq3K7CkoueM" title="Recap" allowfullscreen loading="lazy"></iframe>';
  assert.equal(sanitizeHtml(youtube), youtube);
  const video = '<video controls preload="metadata" style="width:100%" src="https://video.example.com/a.mp4"></video>';
  assert.equal(sanitizeHtml(video), video);
  assert.equal(sanitizeHtml('<iframe src="https://www.youtube.com.evil.example/embed/x"></iframe>'), "");
  assert.equal(sanitizeHtml('<iframe src="//www.youtube.com/embed/x"></iframe>'), "");
});

test("keeps search engine data blocks but no other script type", () => {
  const data = '<script type="application/ld+json">{"@type":"BlogPosting"}</script>';
  assert.equal(sanitizeHtml(data), data);
  assert.equal(sanitizeHtml('<script type="module">alert(1)</script>'), "");
  assert.equal(sanitizeHtml('<script type="application/ld+json" src="https://evil.example/x.js"></script>'), '<script type="application/ld+json"></script>');
});

test("inline style drops anything that loads, runs or pins content", () => {
  assert.equal(sanitizeStyle("color:red; background:url(https://evil.example/x)"), "color:red");
  assert.equal(sanitizeStyle("width:expression(alert(1));padding:4px"), "padding:4px");
  assert.equal(sanitizeStyle("position:fixed;inset:0;z-index:9999"), "inset:0;z-index:9999");
  assert.equal(sanitizeStyle("color:r\\65 d"), "");
  assert.equal(sanitizeStyle("color:red/* x */"), "");
  assert.equal(sanitizeStyle("position:relative;aspect-ratio:16/9;"), "position:relative;aspect-ratio:16/9");
  assert.equal(
    sanitizeHtml('<div style="background:url(javascript:alert(1))">x</div>'),
    "<div>x</div>",
  );
});

test("plain text and entities pass through", () => {
  assert.equal(sanitizeHtml("Tom &amp; Jerry <strong>win</strong>"), "Tom &#x26; Jerry <strong>win</strong>");
  assert.equal(sanitizeHtml(""), "");
});
