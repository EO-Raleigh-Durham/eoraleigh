"use client";

// Neutral training page for the open-source copy. Replace it with your
// chapter's own programs, dates and testimonials.
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { CHAPTER_NAME } from "@/kernel/config/chapter";

const PROGRAMS = [
  {
    title: "Entrepreneurial Masters Program",
    body: "EO's flagship three-year executive program for members, run with leading business schools.",
  },
  {
    title: "KEY Executive programs",
    body: "Programs that bring members' leadership teams into the EO learning experience.",
  },
  {
    title: "Chapter learning events",
    body: `Speakers, workshops and intensives organised by ${CHAPTER_NAME} through the year.`,
  },
];

export function TrainingClient() {
  return (
    <main>
      <section className="section section--hero training-hero">
        <div className="container">
          <Reveal>
            <p className="eyebrow">Leadership training</p>
            <h1 className="display">Keep growing as a leader</h1>
            <p className="lede">
              EO members learn from each other and from world-class faculty. These are the programs open to {CHAPTER_NAME} members.
            </p>
          </Reveal>
        </div>
      </section>
      <section className="section">
        <div className="container">
          <div className="grid grid--3">
            {PROGRAMS.map((p) => (
              <Reveal key={p.title} className="card">
                <h2 className="h3">{p.title}</h2>
                <p>{p.body}</p>
              </Reveal>
            ))}
          </div>
          <div className="row" style={{ gap: 12, marginTop: 32 }}>
            <Link href="/events" className="btn btn--dark">See upcoming events</Link>
            <Link href="/path-of-leadership" className="btn btn--ghost">Path of Leadership</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
