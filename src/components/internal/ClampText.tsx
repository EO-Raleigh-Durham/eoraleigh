"use client";

import { useLayoutEffect, useRef, useState } from "react";

// Shows the first three lines of a block of text with a Read more / Show
// less toggle. The toggle only appears when the text is actually longer.
export function ClampText({ text, className }: { text: string; className?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  const [open, setOpen] = useState(false);
  const [clamped, setClamped] = useState(false);

  // Re-measure on resize: fonts and layout width settle after first paint.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || open) return;
    const measure = () => setClamped(el.scrollHeight > el.clientHeight + 1);
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [open, text]);

  return (
    <>
      <p ref={ref} className={`${className ?? ""} clamp-text${open ? "" : " clamp-text--3"}`}>
        {text}
      </p>
      {(clamped || open) && (
        <button type="button" className="clamp-text__toggle" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
          {open ? "Show less" : "Read more"}
        </button>
      )}
    </>
  );
}
