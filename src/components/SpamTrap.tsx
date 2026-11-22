"use client";

import { useRef, useState } from "react";

// The browser half of lib/spam-guard: a honeypot field people never see
// (off-screen, out of the tab order, hidden from screen readers) and the time
// since the form appeared. Render `field` anywhere inside the form and spread
// `read()` into the JSON body that is posted.
export function useSpamTrap() {
  const ref = useRef<HTMLInputElement>(null);
  const [startedAt] = useState(() => Date.now());

  const field = (
    <div className="sap-suggest-hp" aria-hidden="true">
      <label>
        Company URL
        <input ref={ref} name="company_url" type="text" tabIndex={-1} autoComplete="off" />
      </label>
    </div>
  );

  const read = () => ({
    company_url: ref.current?.value ?? "",
    elapsedMs: Date.now() - startedAt,
  });

  return { field, read };
}
