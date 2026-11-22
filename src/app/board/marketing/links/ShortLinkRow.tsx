"use client";

import { useState, useTransition } from "react";
import { describePlacement } from "@/lib/short-links";
import { setShortLinkActive } from "./actions";

export type ShortLinkListItem = {
  code: string;
  target_path: string;
  utm_source: string | null;
  utm_medium: string | null;
  utm_campaign: string | null;
  utm_content: string | null;
  utm_term: string | null;
  active: boolean;
  clicks: number;
  created_at: string;
};

export function ShortLinkRow({
  link,
  siteUrl,
}: {
  link: ShortLinkListItem;
  siteUrl: string;
}) {
  const [pending, startTransition] = useTransition();
  const [copied, setCopied] = useState(false);
  const shortUrl = `${siteUrl}/l/${link.code}`;

  function copy() {
    navigator.clipboard
      .writeText(shortUrl)
      .then(() => {
        setCopied(true);
        window.setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {
        // Clipboard unavailable: the visible text can be selected by hand.
      });
  }

  function toggle() {
    startTransition(async () => {
      await setShortLinkActive(link.code, !link.active);
    });
  }

  return (
    <tr style={link.active ? undefined : { opacity: 0.55 }}>
      <td>
        <code>{shortUrl.replace("https://", "")}</code>{" "}
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-btn--sm"
          onClick={copy}
        >
          {copied ? "Copied" : "Copy"}
        </button>
      </td>
      <td>{link.target_path}</td>
      <td>{describePlacement(link)}</td>
      <td>{link.clicks}</td>
      <td>
        <button
          type="button"
          className="admin-btn admin-btn--ghost admin-btn--sm"
          onClick={toggle}
          disabled={pending}
        >
          {link.active ? "On" : "Off"}
        </button>
      </td>
    </tr>
  );
}
