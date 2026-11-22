"use client";

import { useEffect, useRef, useState } from "react";

export function PublicLink({ slug, published }: { slug: string; published: boolean }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [copied, setCopied] = useState(false);

  // Upgrade the displayed path to an absolute URL once we're in the browser.
  // Writing to the input's DOM value (not React state) keeps this hydration-safe.
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.value = `${window.location.origin}/survey/${slug}`;
    }
  }, [slug]);

  async function copy() {
    const url = inputRef.current?.value ?? `/survey/${slug}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked; the visible input is selectable as a fallback
      inputRef.current?.select();
    }
  }

  return (
    <div className="svb-link">
      <span className={`admin-badge ${published ? "admin-badge--ok" : "admin-badge--muted"}`}>
        {published ? "Live" : "Not live yet"}
      </span>
      <input
        ref={inputRef}
        className="svb-link-input"
        readOnly
        defaultValue={`/survey/${slug}`}
        onFocus={(e) => e.currentTarget.select()}
      />
      <button type="button" className="admin-btn admin-btn--ghost" onClick={copy}>
        {copied ? "Copied" : "Copy link"}
      </button>
    </div>
  );
}
