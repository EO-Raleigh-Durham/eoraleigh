"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import {
  PLACEMENTS,
  describePlacement,
  placementForLink,
} from "@/lib/short-links";
import { createLinksForPage } from "./actions";
import type { ShortLinkListItem } from "./ShortLinkRow";
import { CHAPTER_CHAT_APP } from "@/kernel/config/chapter";

const STANDARD = PLACEMENTS.filter((p) => p.standard);

// The last choice in each list. It reveals a box to type your own, so a list
// of options never gets in the way.
const CUSTOM_PLACE = "custom";
const OTHER = "__other__";

// Choices instead of typing. A post choice gives a repeat post (a reminder, a
// recap) its own link; an ad choice keeps two ads for one event apart.
const POST_CHOICES = [
  { value: "", label: "The usual link" },
  { value: "reminder-1", label: "Reminder 1" },
  { value: "reminder-2", label: "Reminder 2" },
  { value: "reminder-3", label: "Reminder 3" },
  { value: "last-call", label: "Last call" },
  { value: "recap", label: "Recap" },
];
const AD_CHOICES = [
  { value: "a", label: "Ad A" },
  { value: "b", label: "Ad B" },
  { value: "c", label: "Ad C" },
];

// The usual places first, in the usual order, then repeat posts and ads in the
// order they were made.
function sortLinks(links: ShortLinkListItem[]): ShortLinkListItem[] {
  const rank = (l: ShortLinkListItem) => {
    const placement = placementForLink(l);
    return placement ? PLACEMENTS.indexOf(placement) : PLACEMENTS.length;
  };
  return [...links].sort(
    (a, b) => rank(a) - rank(b) || a.created_at.localeCompare(b.created_at),
  );
}

export function EventLinkCard({
  title,
  dateLabel,
  path,
  noun = "event",
  links,
  siteUrl,
}: {
  title: string;
  dateLabel: string | null;
  path: string;
  // "event" or "blog post", used in the wording of the "all usual links" box.
  noun?: string;
  links: ShortLinkListItem[];
  siteUrl: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);
  const [placementKey, setPlacementKey] = useState(PLACEMENTS[0].key);
  const [customSource, setCustomSource] = useState("");
  const [label, setLabel] = useState("");
  const [customLabel, setCustomLabel] = useState("");
  const [all, setAll] = useState(false);

  const rows = sortLinks(links);
  const totalClicks = links.reduce((sum, l) => sum + l.clicks, 0);
  const isCustomPlace = placementKey === CUSTOM_PLACE;
  const selected = isCustomPlace
    ? null
    : (PLACEMENTS.find((p) => p.key === placementKey) ?? PLACEMENTS[0]);
  const isAd = Boolean(selected?.needsLabel);
  const urlFor = (code: string) => `${siteUrl}/l/${code}`;

  function copy(text: string, id: string) {
    navigator.clipboard
      .writeText(text)
      .then(() => {
        setCopied(id);
        window.setTimeout(() => setCopied(null), 1500);
      })
      .catch(() => {
        // Clipboard unavailable: the link is shown and can be selected by hand.
      });
  }

  function make() {
    setError(null);
    const postName = label === OTHER ? customLabel.trim() : label;
    if (!all) {
      if (isCustomPlace && !customSource.trim()) {
        setError("Type the platform or place the link will be posted");
        return;
      }
      if (label === OTHER && !postName) {
        setError(isAd ? "Type the ad name" : "Type the post name");
        return;
      }
    }
    const formData = new FormData();
    formData.set("path", path);
    formData.set("placement", all ? "standard" : placementKey);
    formData.set("source", all ? "" : customSource);
    formData.set("label", all ? "" : postName);
    startTransition(async () => {
      const result = await createLinksForPage(formData);
      if (!result.ok) {
        setError(result.error);
        return;
      }
      setAll(false);
      setLabel(isAd ? "a" : "");
      setCustomLabel("");
      setCustomSource("");
      router.refresh();
    });
  }

  function copyAll() {
    const lines = rows
      .filter((l) => l.active)
      .map((l) => `${describePlacement(l)}: ${urlFor(l.code)}`);
    copy(lines.join("\n"), "all");
  }

  return (
    <section className="admin-card admin-section-card">
      <div className="admin-card-head">
        <div>
          <div className="admin-card-title">{title}</div>
          <p className="admin-page-sub">
            {[
              dateLabel,
              links.length === 0
                ? "No links yet"
                : `${links.length} ${links.length === 1 ? "link" : "links"}, ${totalClicks} ${totalClicks === 1 ? "click" : "clicks"}`,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
        </div>
        {rows.some((l) => l.active) && (
          <div className="admin-card-actions">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={copyAll}>
              {copied === "all" ? "Copied" : "Copy all"}
            </button>
          </div>
        )}
      </div>

      {rows.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <tbody>
              {rows.map((link) => (
                <tr key={link.code} style={link.active ? undefined : { opacity: 0.55 }}>
                  <td>
                    <strong>{describePlacement(link)}</strong>
                    <div className="admin-page-sub">
                      {placementForLink(link)?.hint ?? "Custom link"}
                    </div>
                  </td>
                  <td>
                    <code>{urlFor(link.code).replace("https://", "")}</code>
                    {link.active ? "" : " (off)"}
                  </td>
                  <td>
                    {link.clicks} {link.clicks === 1 ? "click" : "clicks"}
                  </td>
                  <td>
                    <button
                      type="button"
                      className="admin-btn admin-btn--ghost admin-btn--sm"
                      onClick={() => copy(urlFor(link.code), link.code)}
                    >
                      {copied === link.code ? "Copied" : "Copy"}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {error && (
        <p className="admin-page-sub" role="alert">
          {error}
        </p>
      )}

      <div className="admin-card admin-card--outlined">
        <div className="admin-card-title admin-card-title--compact">Make a link</div>
        <div className="admin-form-row">
          <label className="admin-field">
            <span className="admin-label">Where will it be posted?</span>
            <select
              className="admin-select"
              value={placementKey}
              disabled={all}
              onChange={(e) => {
                const next = PLACEMENTS.find((p) => p.key === e.target.value);
                setPlacementKey(e.target.value);
                setLabel(next?.needsLabel ? "a" : "");
                setCustomLabel("");
              }}
            >
              {PLACEMENTS.map((p) => (
                <option key={p.key} value={p.key}>
                  {p.label}
                </option>
              ))}
              <option value={CUSTOM_PLACE}>Something else...</option>
            </select>
          </label>
          {isCustomPlace && !all && (
            <label className="admin-field">
              <span className="admin-label">Which platform or place?</span>
              <input
                className="admin-input"
                type="text"
                placeholder={`for example YouTube${CHAPTER_CHAT_APP ? `, ${CHAPTER_CHAT_APP} group` : ""}`}
                value={customSource}
                onChange={(e) => setCustomSource(e.target.value)}
              />
            </label>
          )}
          <label className="admin-field">
            <span className="admin-label">{isAd ? "Which ad?" : "Which post?"}</span>
            <select
              className="admin-select"
              value={label}
              disabled={all}
              onChange={(e) => setLabel(e.target.value)}
            >
              {(isAd ? AD_CHOICES : POST_CHOICES).map((c) => (
                <option key={c.value} value={c.value}>
                  {c.label}
                </option>
              ))}
              <option value={OTHER}>Something else...</option>
            </select>
          </label>
          {label === OTHER && !all && (
            <label className="admin-field">
              <span className="admin-label">{isAd ? "Ad name" : "Post name"}</span>
              <input
                className="admin-input"
                type="text"
                placeholder={isAd ? "for example founder-quote" : "for example speaker-intro"}
                value={customLabel}
                onChange={(e) => setCustomLabel(e.target.value)}
              />
            </label>
          )}
        </div>
        <label className="admin-label admin-label--check">
          <input
            type="checkbox"
            checked={all}
            onChange={(e) => setAll(e.target.checked)}
          />{" "}
          Make all {STANDARD.length} usual links for this {noun} instead
        </label>
        {all && (
          <p className="admin-page-sub">
            That is one link each for: {STANDARD.map((p) => p.label).join("; ")}. Any
            that already exist are left as they are.
          </p>
        )}
        <div className="admin-form-actions">
          <button
            type="button"
            className="admin-btn admin-btn--primary"
            disabled={pending}
            onClick={make}
          >
            {pending
              ? "Making..."
              : all
                ? `Make all ${STANDARD.length} links`
                : "Make this link"}
          </button>
        </div>
      </div>
    </section>
  );
}
