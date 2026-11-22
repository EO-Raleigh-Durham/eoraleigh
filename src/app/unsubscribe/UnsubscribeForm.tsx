"use client";

import { useState } from "react";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

// This app's version of edge8-web's UnsubscribeForm: one button that posts the
// signed token to /api/unsubscribe.
export function UnsubscribeForm({ token, contactEmail }: { token: string; contactEmail: string }) {
  const [status, setStatus] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [message, setMessage] = useState("");

  async function handleUnsubscribe() {
    setStatus("sending");
    try {
      const res = await fetch(`/api/unsubscribe?token=${encodeURIComponent(token)}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = (await res.json()) as { ok?: boolean; error?: string };
      if (res.ok && data.ok) {
        setStatus("done");
      } else {
        setStatus("error");
        setMessage(data.error ?? "Something went wrong.");
      }
    } catch {
      setStatus("error");
      setMessage("Could not reach the server.");
    }
  }

  if (status === "done") {
    return (
      <p>
        <strong>You&rsquo;re unsubscribed.</strong> You will not receive any more marketing email from {CHAPTER_NAME}. You
        may still get essential messages about things you signed up for, such as event tickets.
      </p>
    );
  }

  return (
    <>
      <p>
        Click below to stop receiving marketing email from {CHAPTER_NAME}. This does not affect essential messages about
        things you signed up for, such as event tickets.
      </p>
      <p>
        <button type="button" className="btn btn--primary" onClick={handleUnsubscribe} disabled={status === "sending"}>
          {status === "sending" ? "Unsubscribing…" : "Unsubscribe me"}
        </button>
      </p>
      {status === "error" && (
        <p>
          {message} You can also email <a href={`mailto:${contactEmail}`}>{contactEmail}</a> and we will remove you by
          hand.
        </p>
      )}
    </>
  );
}
