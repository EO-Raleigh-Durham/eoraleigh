// Client-only first-touch attribution storage.
//
// Uses localStorage, so only call these from client components. Never
// import this from a server component or route handler — use the pure
// helpers in "@/lib/attribution" there instead.

import {
  parseAttribution,
  replacesFirstTouch,
  type Attribution,
} from "@/lib/attribution";

const KEY = "chapter_first_touch";

export type StoredAttribution = Attribution & { captured_at: string };

// Capture the first touch on landing and persist it. First-touch wins,
// with one exception (replacesFirstTouch): a visit through a UTM-tagged
// link replaces a stored touch that had no UTM tags, so an earlier
// untagged direct visit cannot hide the tagged post link someone clicks
// later. An internal referrer is dropped so a same-site navigation never
// counts as the original source.
export function captureFirstTouch(): void {
  try {
    const attr = parseAttribution(
      window.location.search,
      document.referrer || "",
      window.location.pathname,
    );
    if (attr.referrer && attr.referrer.includes(window.location.host)) {
      attr.referrer = null;
    }
    if (!replacesFirstTouch(readFirstTouch(), attr)) return;
    const stored: StoredAttribution = {
      ...attr,
      captured_at: new Date().toISOString(),
    };
    localStorage.setItem(KEY, JSON.stringify(stored));
  } catch {
    // localStorage unavailable (private mode, etc.) — skip silently.
  }
}

export function readFirstTouch(): StoredAttribution | null {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as StoredAttribution) : null;
  } catch {
    return null;
  }
}
