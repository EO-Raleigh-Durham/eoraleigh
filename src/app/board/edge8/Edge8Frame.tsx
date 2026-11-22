import type { ReactNode } from "react";
import "./tokens.css";
import "./admin.css";
import "./utilities.css";
import "./eo-overrides.css";
import { Edge8BodyClass } from "./Edge8BodyClass";

// The frame every screen ported from edge8-web renders in, inside EO's /board
// shell: edge8's design tokens (EO palette) and its stylesheet, scoped to `.e8`
// so EO's own /board pages are never restyled.
export function Edge8Frame({ children }: { children: ReactNode }) {
  return (
    <div className="e8">
      <Edge8BodyClass />
      {children}
    </div>
  );
}
