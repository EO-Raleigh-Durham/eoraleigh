import type { Metadata } from "next";
import { Logo } from "@/components/Logo";
import { CHAPTER_CITY, CHAPTER_PLACE, CHAPTER_NAME } from "@/kernel/config/chapter";

// The chapter design system — a living styleguide rendered straight from the
// real tokens in globals.css, so it can never drift from production. Internal
// reference; kept out of search results.
export const metadata: Metadata = {
  title: `${CHAPTER_NAME} Design System`,
  description:
    `The living design system for the ${CHAPTER_NAME} website: brand colors, typography, spacing, and components, rendered from the production CSS tokens.`,
  robots: { index: false, follow: false },
};

// ── Data: mirrors the :root tokens in globals.css ───────────────────────────

type Swatch = { name: string; token: string; hex: string; note?: string; onDark?: boolean };

const BRAND: Swatch[] = [
  { name: "EO Blue", token: "--eo-blue", hex: "#3D46F2", note: "PMS 2728 C · primary brand + accent" },
  { name: "Base Blue", token: "--base-blue", hex: "#0C0C31", note: "PMS 282 C · deepest surface, body text" },
  { name: "Light Accent Blue", token: "--eo-blue-light", hex: "#A3A7E4", note: "accents on EO Blue" },
  { name: "Dark Accent Blue", token: "--eo-blue-dark", hex: "#1D007F", note: "accent-hover, gradients" },
];

const PRIMARIES: { name: string; token: string; hex: string; light: string; dark: string }[] = [
  { name: "Pink", token: "--eo-pink", hex: "#FF346E", light: "#FFB0C8", dark: "#A32246" },
  { name: "Orange", token: "--eo-orange", hex: "#FA653C", light: "#FFB5A4", dark: "#C94C3F" },
  { name: "Yellow", token: "--eo-yellow", hex: "#EFB82E", light: "#FCDE95", dark: "#BF8B0A" },
  { name: "Green", token: "--eo-green", hex: "#1EA691", light: "#ACE2D4", dark: "#216854" },
  { name: "Gray", token: "--eo-gray", hex: "#5E617D", light: "#B7B8C3", dark: "#3C3E50" },
];

const NEUTRALS: Swatch[] = [
  { name: "ink-950", token: "--ink-950", hex: "#0C0C31" },
  { name: "ink-900", token: "--ink-900", hex: "#16163D" },
  { name: "ink-800", token: "--ink-800", hex: "#232348" },
  { name: "ink-700", token: "--ink-700", hex: "#3C3E50" },
  { name: "ink-600", token: "--ink-600", hex: "#5E617D" },
  { name: "ink-500", token: "--ink-500", hex: "#82859E" },
  { name: "ink-400", token: "--ink-400", hex: "#A6A9BD" },
  { name: "ink-300", token: "--ink-300", hex: "#B7B8C3" },
  { name: "ink-200", token: "--ink-200", hex: "#D8D9E2" },
  { name: "ink-100", token: "--ink-100", hex: "#ECEDF2" },
  { name: "ink-50", token: "--ink-50", hex: "#F6F7FA" },
  { name: "paper", token: "--paper", hex: "#FFFFFF" },
];

const SEMANTICS: { token: string; maps: string; usage: string }[] = [
  { token: "--bg", maps: "paper", usage: "Default page background" },
  { token: "--bg-alt", maps: "ink-50", usage: "Alternating section background" },
  { token: "--bg-dark", maps: "base-blue", usage: "Dark hero / footer surface" },
  { token: "--text", maps: "base-blue", usage: "Body text on light" },
  { token: "--text-muted", maps: "ink-600", usage: "Secondary text, leads" },
  { token: "--text-faint", maps: "ink-500", usage: "Tertiary / captions" },
  { token: "--text-on-dark", maps: "#FFFFFF", usage: "Text on dark surfaces" },
  { token: "--text-on-dark-muted", maps: "white 72%", usage: "Secondary text on dark" },
  { token: "--border", maps: "ink-200", usage: "Default hairline borders" },
  { token: "--border-strong", maps: "ink-300", usage: "Emphasised borders, inputs" },
  { token: "--accent", maps: "eo-blue", usage: "Links, active state, accents" },
  { token: "--accent-hover", maps: "eo-blue-dark", usage: "Hover / pressed accent" },
];

const TYPE_SPECIMENS: { cls: string; label: string; spec: string; sample: string }[] = [
  { cls: "display-1", label: "Display 1", spec: "Roboto 900 · clamp(60–124px) · lh 0.94", sample: "Master Growth" },
  { cls: "display-2", label: "Display 2", spec: "Roboto 900 · clamp(48–84px) · lh 0.96", sample: "Multiply Impact" },
  { cls: "display-3", label: "Display 3", spec: "Roboto 800 · clamp(36–56px) · lh 1.02", sample: "The next ninety days" },
  { cls: "heading-1", label: "Heading 1", spec: "Roboto 700 · clamp(28–40px)", sample: "Why founders join EO" },
  { cls: "heading-2", label: "Heading 2", spec: "Roboto 700 · 28px", sample: "Forum, the 8 peers" },
  { cls: "heading-3", label: "Heading 3", spec: "Roboto 600 · 22px", sample: "Member events" },
  { cls: "lead", label: "Lead", spec: "Roboto 400 · 18px · muted", sample: "Monthly learning events with operators who have done it." },
  { cls: "body", label: "Body", spec: "Roboto 400 · 16px · lh 1.6", sample: `The full ${CHAPTER_NAME} calendar, in one place, updated every week by the chapter team.` },
];

const SPACING = [
  ["--space-1", 4], ["--space-2", 8], ["--space-3", 12], ["--space-4", 16],
  ["--space-5", 20], ["--space-6", 24], ["--space-8", 32], ["--space-10", 40],
  ["--space-12", 48], ["--space-16", 64], ["--space-20", 80], ["--space-24", 96],
  ["--space-32", 128],
] as const;

const RADII = [
  ["--r-xs", 2], ["--r-sm", 4], ["--r-md", 6], ["--r-lg", 8],
  ["--r-xl", 12], ["--r-2xl", 16], ["--r-pill", 999],
] as const;

const SHADOWS = ["--shadow-sm", "--shadow-md", "--shadow-lg", "--shadow-xl"] as const;

const MOTION: { token: string; val: string; usage: string }[] = [
  { token: "--t-fast", val: "140ms", usage: "Hovers, small state changes" },
  { token: "--t-med", val: "240ms", usage: "Menus, reveals" },
  { token: "--t-slow", val: "480ms", usage: "Page / hero transitions" },
  { token: "--ease", val: "cubic-bezier(.4,0,.2,1)", usage: "Default easing" },
  { token: "--ease-out-expo", val: "cubic-bezier(.16,1,.3,1)", usage: "Scroll reveals" },
];

const LAYOUT: { token: string; val: string; usage: string }[] = [
  { token: "--container", val: "1280px", usage: "Default page width" },
  { token: "--container-narrow", val: "960px", usage: "Article / detail width" },
  { token: "--container-text", val: "720px", usage: "Reading measure" },
  { token: "--gutter", val: "clamp(20–48px)", usage: "Side padding" },
  { token: "--topbar-h", val: "88px", usage: "Sticky topbar height" },
];

// ── Section scaffold ────────────────────────────────────────────────────────

function Section({ id, n, title, children }: { id: string; n: string; title: string; children: React.ReactNode }) {
  return (
    <section id={id} className="sg-section">
      <div className="sg-section-head">
        <span className="mono sg-num">{n}</span>
        <h2 className="heading-1">{title}</h2>
      </div>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  const NAV = [
    ["01", "brand", "Brand"],
    ["02", "color", "Color"],
    ["03", "type", "Typography"],
    ["04", "space", "Spacing"],
    ["05", "radii", "Radii"],
    ["06", "shadow", "Elevation"],
    ["07", "motion", "Motion & layout"],
    ["08", "components", "Components"],
    ["09", "voice", "Voice"],
  ];

  return (
    <div className="sg-page">
      {/* HEADER */}
      <header className="sg-hero">
        <div className="container">
          <span className="eyebrow eyebrow--accent">Design system · v1</span>
          <h1 className="display-2" style={{ margin: "16px 0 20px" }}>
            {CHAPTER_NAME} Design System
          </h1>
          <p className="lead" style={{ maxWidth: 640 }}>
            The single source of truth for the {CHAPTER_NAME} website. Every value below is rendered
            live from the production tokens in <code className="sg-code">globals.css</code>, so this
            page can never drift from what ships.
          </p>
          <nav className="sg-nav">
            {NAV.map(([n, id, label]) => (
              <a key={id} href={`#${id}`} className="sg-nav-link">
                <span className="mono">{n}</span> {label}
              </a>
            ))}
          </nav>
        </div>
      </header>

      <div className="container sg-body">
        {/* 01 BRAND */}
        <Section id="brand" n="01" title="Brand & logo">
          <p className="lead" style={{ maxWidth: 640, marginBottom: 32 }}>
            {CHAPTER_NAME} is the {CHAPTER_PLACE} chapter of Entrepreneurs&apos; Organization: a trusted
            community of founders, part of a global network of 20,000+ across 61 countries. The
            voice is confident, peer-to-peer, and plain-spoken.
          </p>
          <div className="sg-logo-grid">
            <div className="sg-logo-tile sg-logo-tile--light">
              <Logo />
              <span className="caption">primary · on light</span>
            </div>
            <div className="sg-logo-tile sg-logo-tile--dark">
              <Logo inverted />
              <span className="caption caption--on-dark">white · on dark</span>
            </div>
          </div>
          <p className="body-sm text-muted" style={{ marginTop: 16 }}>
            Variants: <code className="sg-code">primary</code>, <code className="sg-code">white</code>,{" "}
            <code className="sg-code">black</code>, <code className="sg-code">inverse</code> — in{" "}
            <code className="sg-code">/public/logo/</code>. Use white on dark surfaces, primary on
            light. Never recolor the mark.
          </p>
        </Section>

        {/* 02 COLOR */}
        <Section id="color" n="02" title="Color">
          <h3 className="heading-3 sg-subhead">Brand</h3>
          <div className="sg-swatch-grid">
            {BRAND.map((s) => <SwatchCard key={s.token} s={s} big />)}
          </div>

          <h3 className="heading-3 sg-subhead">Primaries</h3>
          <p className="body-sm text-muted" style={{ marginBottom: 20 }}>
            Five accent families, each with a light and dark partner. Use sparingly for category
            coding and illustration, never for body text.
          </p>
          <div className="sg-primary-grid">
            {PRIMARIES.map((p) => (
              <div key={p.token} className="sg-primary">
                <div className="sg-primary-bar">
                  <span style={{ background: p.light }} title={p.light} />
                  <span style={{ background: p.hex }} title={p.hex} />
                  <span style={{ background: p.dark }} title={p.dark} />
                </div>
                <div className="sg-primary-meta">
                  <strong>{p.name}</strong>
                  <code className="sg-code">{p.token}</code>
                  <span className="mono sg-hex">{p.hex}</span>
                </div>
              </div>
            ))}
          </div>

          <h3 className="heading-3 sg-subhead">Neutrals (ink ramp)</h3>
          <div className="sg-ink-ramp">
            {NEUTRALS.map((s) => (
              <div key={s.token} className="sg-ink-step">
                <div className="sg-ink-chip" style={{ background: s.hex }} />
                <span className="mono sg-ink-label">{s.name}</span>
                <span className="mono sg-hex">{s.hex}</span>
              </div>
            ))}
          </div>

          <h3 className="heading-3 sg-subhead">Semantic tokens</h3>
          <div className="sg-table-wrap">
            <table className="sg-table">
              <thead><tr><th>Token</th><th>Maps to</th><th>Usage</th></tr></thead>
              <tbody>
                {SEMANTICS.map((r) => (
                  <tr key={r.token}>
                    <td><code className="sg-code">{r.token}</code></td>
                    <td className="mono sg-hex">{r.maps}</td>
                    <td className="text-muted">{r.usage}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Section>

        {/* 03 TYPOGRAPHY */}
        <Section id="type" n="03" title="Typography">
          <p className="lead" style={{ maxWidth: 640, marginBottom: 8 }}>
            Roboto across the board, anchored to the hero headline. Roboto Mono for labels and
            metadata, Roboto Serif reserved for editorial.
          </p>
          <div className="sg-font-row">
            <span style={{ fontFamily: "var(--font-sans)" }}>Roboto · 300/400/500/700/900</span>
            <span className="mono">Roboto Mono · 400/500/700</span>
            <span style={{ fontFamily: "var(--font-serif)" }}>Roboto Serif · 400/500/700</span>
          </div>
          <div className="sg-specimens">
            {TYPE_SPECIMENS.map((t) => (
              <div key={t.cls} className="sg-specimen">
                <div className="sg-specimen-meta">
                  <code className="sg-code">.{t.cls}</code>
                  <span className="caption text-faint">{t.spec}</span>
                </div>
                <div className={t.cls}>{t.sample}</div>
              </div>
            ))}
            <div className="sg-specimen">
              <div className="sg-specimen-meta">
                <code className="sg-code">.eyebrow / .caption / .mono</code>
                <span className="caption text-faint">labels & metadata</span>
              </div>
              <div style={{ display: "flex", gap: 24, flexWrap: "wrap", alignItems: "center" }}>
                <span className="eyebrow eyebrow--accent">Member events</span>
                <span className="caption">Looking back?</span>
                <span className="mono">JUL 02, 2026</span>
              </div>
            </div>
          </div>
        </Section>

        {/* 04 SPACING */}
        <Section id="space" n="04" title="Spacing">
          <p className="body-sm text-muted" style={{ marginBottom: 24 }}>
            A 4px base scale. Use tokens, not arbitrary pixels.
          </p>
          <div className="sg-scale">
            {SPACING.map(([token, px]) => (
              <div key={token} className="sg-scale-row">
                <code className="sg-code">{token}</code>
                <span className="mono sg-hex">{px}px</span>
                <span className="sg-scale-bar" style={{ width: px }} />
              </div>
            ))}
          </div>
        </Section>

        {/* 05 RADII */}
        <Section id="radii" n="05" title="Radii">
          <div className="sg-radii-grid">
            {RADII.map(([token, px]) => (
              <div key={token} className="sg-radius">
                <div className="sg-radius-box" style={{ borderRadius: px }} />
                <code className="sg-code">{token}</code>
                <span className="mono sg-hex">{px === 999 ? "pill" : `${px}px`}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* 06 ELEVATION */}
        <Section id="shadow" n="06" title="Elevation">
          <div className="sg-shadow-grid">
            {SHADOWS.map((token) => (
              <div key={token} className="sg-shadow-card" style={{ boxShadow: `var(${token})` }}>
                <code className="sg-code">{token}</code>
              </div>
            ))}
          </div>
        </Section>

        {/* 07 MOTION & LAYOUT */}
        <Section id="motion" n="07" title="Motion & layout">
          <div className="sg-two-col">
            <div>
              <h3 className="heading-3 sg-subhead">Motion</h3>
              <div className="sg-table-wrap">
                <table className="sg-table">
                  <thead><tr><th>Token</th><th>Value</th><th>Usage</th></tr></thead>
                  <tbody>
                    {MOTION.map((m) => (
                      <tr key={m.token}>
                        <td><code className="sg-code">{m.token}</code></td>
                        <td className="mono sg-hex">{m.val}</td>
                        <td className="text-muted">{m.usage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
            <div>
              <h3 className="heading-3 sg-subhead">Layout</h3>
              <div className="sg-table-wrap">
                <table className="sg-table">
                  <thead><tr><th>Token</th><th>Value</th><th>Usage</th></tr></thead>
                  <tbody>
                    {LAYOUT.map((l) => (
                      <tr key={l.token}>
                        <td><code className="sg-code">{l.token}</code></td>
                        <td className="mono sg-hex">{l.val}</td>
                        <td className="text-muted">{l.usage}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </Section>

        {/* 08 COMPONENTS */}
        <Section id="components" n="08" title="Components">
          <h3 className="heading-3 sg-subhead">Buttons</h3>
          <div className="sg-demo">
            <button className="btn btn--primary">Primary</button>
            <button className="btn btn--dark">Dark</button>
            <button className="btn btn--ghost">Ghost</button>
            <button className="btn btn--sm btn--primary">Small</button>
            <button className="btn btn--lg btn--primary">Large</button>
          </div>
          <div className="sg-demo sg-demo--dark">
            <button className="btn btn--white">White</button>
            <button className="btn btn--ghost-on-dark">Ghost on dark</button>
          </div>
          <p className="body-sm text-muted sg-demo-note">
            <code className="sg-code">.btn</code> + a variant. Pill radius, 14/24 padding.
          </p>

          <h3 className="heading-3 sg-subhead">Chips & tags</h3>
          <div className="sg-demo sg-demo--dark">
            <span className="evd-chip">Learning</span>
            <span className="evd-chip evd-chip--ghost">Members only</span>
            <span className="evd-chip evd-chip--ghost">Past event</span>
          </div>

          <h3 className="heading-3 sg-subhead">Filter pills</h3>
          <div className="sg-demo">
            <button className="events-filter-pill is-active">All</button>
            <button className="events-filter-pill">Learning</button>
            <button className="events-filter-pill">Social</button>
          </div>

          <h3 className="heading-3 sg-subhead">Event row</h3>
          <div className="events-list" style={{ maxWidth: 720 }}>
            <a className="event-row event-row--link" href="#components">
              <div className="event-row-date">
                <div className="event-row-day">18</div>
                <div className="event-row-month mono">SEP</div>
              </div>
              <div className="event-row-body">
                <div className="event-row-cat mono">Learning · Speaker</div>
                <h3 className="event-row-title">Tune Your Inner Voice</h3>
                <div className="event-row-meta">
                  <span>Rhonda Ross</span><span className="divider" /><span>{CHAPTER_CITY || "Main venue"}</span>
                </div>
              </div>
              <div className="event-row-cta"><span className="event-row-arrow">→</span></div>
            </a>
          </div>

          <h3 className="heading-3 sg-subhead">Form fields</h3>
          <div className="rsvp-form" style={{ marginTop: 8 }}>
            <div className="rsvp-form-grid">
              <label className="rsvp-field">
                <span className="rsvp-label">Name</span>
                <input type="text" placeholder="Jane Founder" />
              </label>
              <label className="rsvp-field">
                <span className="rsvp-label">Email</span>
                <input type="email" placeholder="jane@company.com" />
              </label>
            </div>
          </div>

          <h3 className="heading-3 sg-subhead">Section surfaces</h3>
          <div className="sg-surfaces">
            <div className="sg-surface" style={{ background: "var(--bg)" }}><span className="caption">--bg</span></div>
            <div className="sg-surface" style={{ background: "var(--bg-alt)" }}><span className="caption">--bg-alt</span></div>
            <div className="sg-surface" style={{ background: "var(--bg-warm)" }}><span className="caption">--bg-warm</span></div>
            <div className="sg-surface" style={{ background: "var(--base-blue)" }}><span className="caption caption--on-dark">--bg-dark</span></div>
            <div className="sg-surface" style={{ background: "var(--eo-blue)" }}><span className="caption caption--on-dark">--bg-blue</span></div>
          </div>
        </Section>

        {/* 09 VOICE */}
        <Section id="voice" n="09" title="Voice & editorial rules">
          <ul className="sg-rules">
            <li><strong>No em dashes.</strong> Use commas, periods, or colons. Max one per page if truly unavoidable.</li>
            <li><strong>No periods on headings or titles.</strong> h1–h3, page titles, section headlines.</li>
            <li><strong>&quot;Strategic Alliance Partner&quot;</strong>, never bare &quot;partner&quot;, for sponsors.</li>
            <li><strong>Confident and peer-to-peer.</strong> Plain-spoken, specific, no consultant-speak.</li>
            <li><strong>Type is the system.</strong> Authors pick classes (<code className="sg-code">.display-1</code>, <code className="sg-code">.lead</code>), not fonts or sizes.</li>
          </ul>
        </Section>

        <footer className="sg-footer">
          <p className="body-sm text-faint">
            Rendered from <code className="sg-code">src/app/globals.css</code>. Edit the tokens there and this page updates with them.
          </p>
        </footer>
      </div>
    </div>
  );
}

function SwatchCard({ s, big }: { s: Swatch; big?: boolean }) {
  return (
    <div className={`sg-swatch ${big ? "sg-swatch--big" : ""}`.trim()}>
      <div className="sg-swatch-chip" style={{ background: s.hex }} />
      <div className="sg-swatch-meta">
        <strong>{s.name}</strong>
        <code className="sg-code">{s.token}</code>
        <span className="mono sg-hex">{s.hex}</span>
        {s.note && <span className="body-sm text-muted">{s.note}</span>}
      </div>
    </div>
  );
}
