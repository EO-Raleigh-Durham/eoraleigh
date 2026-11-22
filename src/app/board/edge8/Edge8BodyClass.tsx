"use client";

import { useEffect } from "react";

// Edge8's screens are styled under `.e8` (scripts/edge8-sync/css.mjs). Their
// drawers and dialogs portal straight to <body>, outside the page's .e8
// wrapper, so while an edge8 screen is open <body> carries the class too.
export function Edge8BodyClass() {
  useEffect(() => {
    document.body.classList.add("e8");
    return () => document.body.classList.remove("e8");
  }, []);
  return null;
}
