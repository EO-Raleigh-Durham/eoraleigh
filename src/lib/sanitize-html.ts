import { raw } from "hast-util-raw";
import { defaultSchema, sanitize, type Schema } from "hast-util-sanitize";
import { toHtml } from "hast-util-to-html";

// Allow-list sanitiser for HTML that board accounts write into blog posts,
// newsletters and event recaps (rendered by components/blog/BlockRenderer).
// That HTML reaches every visitor through dangerouslySetInnerHTML, so it is
// treated as untrusted: only formatting, tables, links, images and simple
// charts survive.
//
// Built on hast-util-sanitize's GitHub-style default (the same base as
// kernel/config/post-html-schema.ts): forms, <style>, <object>, every on*
// handler and javascript: URLs are dropped. Widened only by what the house
// content already uses:
//   - class and inline style on any element (tables and callouts are styled
//     inline); style is filtered by sanitizeStyle below
//   - figure / figcaption, target / rel on links, role and aria labels
//   - video / audio players pointing at an http(s) file
//   - inline SVG shapes and text for the hand-drawn charts (no <use>,
//     <foreignObject>, <image> or animation elements)
//   - two narrow exceptions, checked again after sanitising: a YouTube embed
//     <iframe>, and <script type="application/ld+json"> (search engine data,
//     which browsers never run)
const base = defaultSchema.attributes ?? {};

// The default limits class on a few tags to GitHub's own class names. Drop
// those limits so the "*" rule below decides.
const attributes: NonNullable<Schema["attributes"]> = {};
for (const [tag, list] of Object.entries(base)) {
  attributes[tag] = list.filter(
    (entry) => (Array.isArray(entry) ? entry[0] : entry) !== "className",
  );
}

const SVG_TAGS = [
  "svg", "g", "rect", "circle", "ellipse", "line", "path", "polyline",
  "polygon", "text", "tspan",
];
const SVG_ATTRIBUTES = [
  "viewBox", "preserveAspectRatio", "x", "y", "x1", "y1", "x2", "y2", "cx",
  "cy", "r", "rx", "ry", "dx", "dy", "d", "points", "transform", "opacity",
  "fill", "fillOpacity", "stroke", "strokeWidth", "strokeOpacity",
  "strokeDashArray", "strokeLineCap", "strokeLineJoin", "textAnchor",
  "dominantBaseline", "fontSize", "fontWeight", "fontFamily", "letterSpacing",
];

const SCHEMA: Schema = {
  ...defaultSchema,
  tagNames: [
    ...(defaultSchema.tagNames ?? []),
    "figure", "figcaption", "video", "audio", "source", "iframe", "script",
    ...SVG_TAGS,
  ],
  // Removed together with their contents rather than unwrapped into text.
  strip: ["style", "noscript", "template"],
  attributes: {
    ...attributes,
    "*": [
      ...(attributes["*"] ?? []),
      "className", "style", "role", "ariaHidden", "ariaLabel",
      ...SVG_ATTRIBUTES,
    ],
    a: [...(attributes.a ?? []), "target", "rel"],
    video: ["src", "poster", "controls", "preload", "muted", "loop", "playsInline", "autoPlay"],
    audio: ["src", "controls", "preload"],
    source: ["src", "type"],
    iframe: ["src", "title", "allow", "allowFullScreen", "referrerPolicy", "loading"],
    script: [["type", "application/ld+json"]],
  },
  // Relative paths always pass; these are the only schemes that may appear.
  protocols: {
    ...defaultSchema.protocols,
    href: ["http", "https", "mailto"],
    src: ["http", "https"],
    poster: ["http", "https"],
  },
};

const YOUTUBE_EMBED =
  /^https:\/\/www\.youtube(-nocookie)?\.com\/embed\/[\w-]+(\?[\w=&%.-]*)?$/;

// Inline style keeps plain declarations only. Anything that can load a
// resource, run code in an old browser, hide itself behind a CSS escape or
// comment, or pin content over the rest of the page is dropped.
const UNSAFE_STYLE = /url\s*\(|expression|javascript:|@import|behavior|-moz-binding|[\\<>]|\/\*/i;
const PINNED_POSITION = /^position\s*:\s*(fixed|sticky)/i;

export function sanitizeStyle(style: string): string {
  return style
    .split(";")
    .map((declaration) => declaration.trim())
    .filter(
      (declaration) =>
        declaration.includes(":") &&
        !UNSAFE_STYLE.test(declaration) &&
        !PINNED_POSITION.test(declaration),
    )
    .join(";");
}

type Node = {
  type: string;
  tagName?: string;
  properties?: Record<string, unknown>;
  children?: Node[];
};

// The checks the schema cannot express: the two narrow exceptions, and the
// inline style filter.
function allowed(node: Node): boolean {
  if (node.tagName === "script") {
    return node.properties?.type === "application/ld+json";
  }
  if (node.tagName === "iframe") {
    return YOUTUBE_EMBED.test(String(node.properties?.src ?? ""));
  }
  return true;
}

function clean(node: Node): void {
  if (node.properties && typeof node.properties.style === "string") {
    const style = sanitizeStyle(node.properties.style);
    if (style) node.properties.style = style;
    else delete node.properties.style;
  }
  if (!node.children) return;
  node.children = node.children.filter(allowed);
  for (const child of node.children) clean(child);
}

export function sanitizeHtml(html: string): string {
  const tree = sanitize(
    raw({ type: "root", children: [{ type: "raw", value: html ?? "" }] }),
    SCHEMA,
  ) as Node;
  clean(tree);
  return toHtml(tree as Parameters<typeof toHtml>[0]);
}
