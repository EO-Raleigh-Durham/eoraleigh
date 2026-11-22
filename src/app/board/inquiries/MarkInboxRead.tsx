"use client";

import { useEffect, useRef } from "react";
import { markInboxRead } from "./actions";

// Renders nothing. Marks board messages read on first view so the sidebar inbox
// badge clears once the board opens the inbox.
export function MarkInboxRead() {
  const done = useRef(false);
  useEffect(() => {
    if (done.current) return;
    done.current = true;
    void markInboxRead();
  }, []);
  return null;
}
