"use client";

import { useState } from "react";
import { EventLinkCard } from "./EventLinkCard";
import type { ShortLinkListItem } from "./ShortLinkRow";

export type PickerEvent = {
  path: string;
  title: string;
  dateLabel: string | null;
  // "earlier" events are over but still have links. "blog" is a blog post,
  // "recap" an event recap.
  group: "current" | "blog" | "recap" | "earlier";
};

// One picker for the whole page: choose an event, and its card (date, its
// links or "No links yet", and the box to make more) appears below.
export function EventLinksPicker({
  events,
  linksByPath,
  siteUrl,
}: {
  events: PickerEvent[];
  linksByPath: Record<string, ShortLinkListItem[]>;
  siteUrl: string;
}) {
  const [path, setPath] = useState("");
  const chosen = events.find((e) => e.path === path) ?? null;

  const optionText = (e: PickerEvent) => {
    const count = (linksByPath[e.path] ?? []).length;
    const status = count === 0 ? "no links yet" : `${count} ${count === 1 ? "link" : "links"}`;
    return [e.title, e.dateLabel, status].filter(Boolean).join(" · ");
  };

  const current = events.filter((e) => e.group === "current");
  const blog = events.filter((e) => e.group === "blog");
  const recaps = events.filter((e) => e.group === "recap");
  const earlier = events.filter((e) => e.group === "earlier");

  return (
    <div className="admin-form">
      <label className="admin-field admin-field--wide">
        <span className="admin-label">Which event or blog post?</span>
        <select
          className="admin-select"
          value={path}
          onChange={(e) => setPath(e.target.value)}
        >
          <option value="">Pick an event or a blog post</option>
          {current.map((e) => (
            <option key={e.path} value={e.path}>
              {optionText(e)}
            </option>
          ))}
          {blog.length > 0 && (
            <optgroup label="Blog posts">
              {blog.map((e) => (
                <option key={e.path} value={e.path}>
                  {optionText(e)}
                </option>
              ))}
            </optgroup>
          )}
          {recaps.length > 0 && (
            <optgroup label="Event recaps">
              {recaps.map((e) => (
                <option key={e.path} value={e.path}>
                  {optionText(e)}
                </option>
              ))}
            </optgroup>
          )}
          {earlier.length > 0 && (
            <optgroup label="Earlier events and pages">
              {earlier.map((e) => (
                <option key={e.path} value={e.path}>
                  {optionText(e)}
                </option>
              ))}
            </optgroup>
          )}
        </select>
      </label>

      {chosen && (
        <EventLinkCard
          key={chosen.path}
          title={chosen.title}
          dateLabel={chosen.dateLabel}
          path={chosen.path}
          noun={
            chosen.group === "blog"
              ? "blog post"
              : chosen.group === "recap"
                ? "recap"
                : "event"
          }
          links={linksByPath[chosen.path] ?? []}
          siteUrl={siteUrl}
        />
      )}
    </div>
  );
}
