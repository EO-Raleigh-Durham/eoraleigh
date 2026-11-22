"use client";

import { useState } from "react";
import { submitBoardMessage } from "./actions";

export function ContactBoardForm() {
  const [subject, setSubject] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("sending");
    setError(null);
    const res = await submitBoardMessage(subject, message);
    if (res.ok) {
      setState("done");
      setSubject("");
      setMessage("");
    } else {
      setError(res.error);
      setState("error");
    }
  }

  if (state === "done") {
    return (
      <div className="ptl-form-success">
        <h2 className="ptl-modal-title">Message sent</h2>
        <p className="text-muted" style={{ marginBottom: 24 }}>
          Thanks. The board has your message and will get back to you.
        </p>
        <button
          type="button"
          className="btn btn--dark"
          onClick={() => setState("idle")}
        >
          Send another
        </button>
      </div>
    );
  }

  return (
    <form className="ptl-form" onSubmit={onSubmit}>
      <label className="ptl-label">
        Subject
        <input
          type="text"
          className="ptl-input"
          value={subject}
          onChange={(e) => setSubject(e.target.value)}
          placeholder="What is this about?"
          required
        />
      </label>
      <label className="ptl-label">
        Message
        <textarea
          className="ptl-textarea"
          rows={7}
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Write your question or suggestion for the board…"
          required
        />
      </label>
      {error && <p className="ptl-form-error">{error}</p>}
      <button
        type="submit"
        className="btn btn--primary btn--lg"
        disabled={state === "sending"}
      >
        {state === "sending" ? "Sending…" : "Send to the board"}
      </button>
    </form>
  );
}
