"use client";

import { useEffect } from "react";
import { captureFirstTouch } from "@/lib/attribution-client";

// Records first-touch marketing attribution on first landing (UTM params
// + referrer + landing path) into localStorage. Mounted once in the root
// layout. Renders nothing.
export function AttributionCapture() {
  useEffect(() => {
    captureFirstTouch();
  }, []);
  return null;
}
