"use client";

import { useEffect } from "react";

export default function Error({
  error,
  retry,
}: {
  error: unknown;
  retry: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <section className="section">
      <div
        className="container container--narrow"
        style={{ textAlign: "center", padding: "64px 0" }}
      >
        <h1 className="display-3" style={{ marginBottom: 16 }}>
          Something went wrong
        </h1>
        <p className="lead" style={{ marginBottom: 32 }}>
          Please try again. If it keeps happening, come back in a few minutes.
        </p>
        <div className="row" style={{ justifyContent: "center", gap: 12 }}>
          <button type="button" className="btn btn--primary" onClick={() => retry()}>
            Try again
          </button>
          {/* A full page load, not a client transition, so a broken client state is cleared. */}
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
          <a href="/" className="btn btn--dark">
            Back to home
          </a>
        </div>
      </div>
    </section>
  );
}
