import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

export default function NotFound() {
  return (
    <section className="section">
      <div
        className="container container--narrow"
        style={{ textAlign: "center", padding: "64px 0" }}
      >
        <h1 className="display-3" style={{ marginBottom: 16 }}>
          We could not find that page
        </h1>
        <p className="lead" style={{ marginBottom: 32 }}>
          It may have moved, or the link may be out of date.
        </p>
        <div className="row" style={{ justifyContent: "center", gap: 12 }}>
          <Link href="/events" className="btn btn--primary">
            See events
          </Link>
          <Link href="/" className="btn btn--dark">
            Back to home
          </Link>
        </div>
      </div>
    </section>
  );
}
