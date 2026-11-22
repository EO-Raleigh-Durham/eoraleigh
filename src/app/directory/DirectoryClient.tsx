"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { CHAPTER_NAME } from "@/kernel/config/chapter";
import { DIRECTORY_MEMBERS as MEMBERS } from "@/content/directory-members";

const AVATAR_COLORS = ["#3D46F2", "#FF346E", "#FA653C", "#EFB82E", "#1EA691"];

function avatarColor(name: string, company: string) {
  const i = (name.charCodeAt(0) + company.length) % AVATAR_COLORS.length;
  return AVATAR_COLORS[i];
}

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .slice(0, 2)
    .join("");
}

export function DirectoryClient() {
  const [query, setQuery] = useState("");
  const [city, setCity] = useState("All cities");
  const [industry, setIndustry] = useState("All industries");

  const cities = ["All cities", ...Array.from(new Set(MEMBERS.map((m) => m.city))).sort()];
  const industries = ["All industries", ...Array.from(new Set(MEMBERS.map((m) => m.industry))).sort()];

  const filtered = useMemo(() => {
    return MEMBERS.filter((m) => {
      const q = query.toLowerCase();
      if (q && !`${m.name} ${m.company} ${m.role}`.toLowerCase().includes(q)) return false;
      if (city !== "All cities" && m.city !== city) return false;
      if (industry !== "All industries" && m.industry !== industry) return false;
      return true;
    });
  }, [query, city, industry]);

  return (
    <div className="directory-page">
      {/* HERO */}
      <section className="section section--hero directory-hero">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--accent">Member directory</span>
            <h1 className="display-1 directory-hero-headline">
              The people
              <br />
              <span style={{ color: "var(--accent)" }}>in the rooms</span>
            </h1>
            <p className="lead directory-hero-sub">
              {CHAPTER_NAME} founders running companies across legal, manufacturing, technology, healthcare, retail, real estate, hospitality, and beyond. Members can browse and reach each other directly. Non-members see the breadth of the chapter, not the contact details.
            </p>
          </Reveal>
        </div>
      </section>

      {/* CONTROLS */}
      <section className="section section--alt directory-controls-section">
        <div className="container">
          <div className="directory-controls">
            <div className="directory-search">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <circle cx="7" cy="7" r="5.5" stroke="currentColor" strokeWidth="1.4" />
                <path d="M11 11l3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
              </svg>
              <input
                type="text"
                placeholder="Search by name, company, or role"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
              />
            </div>
            <div className="directory-selects">
              <select value={city} onChange={(e) => setCity(e.target.value)}>
                {cities.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
              <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
                {industries.map((i) => (
                  <option key={i} value={i}>{i}</option>
                ))}
              </select>
            </div>
            <div className="directory-count mono">
              {filtered.length} of {MEMBERS.length} members
            </div>
          </div>
        </div>
      </section>

      {/* GRID */}
      <section className="section">
        <div className="container">
          {filtered.length === 0 ? (
            <div className="directory-empty">
              <p className="lead text-muted">No members match those filters. Try widening the search.</p>
            </div>
          ) : (
            <div className="directory-grid">
              {filtered.map((m) => (
                <div key={m.name} className="directory-card">
                  <div className="directory-card-avatar" style={{ background: avatarColor(m.name, m.company) }}>
                    <span className="mono">{initials(m.name)}</span>
                  </div>
                  <div className="directory-card-body">
                    <div className="directory-card-meta mono">
                      <span>{m.city.toUpperCase()}</span>
                      <span className="dot"></span>
                      <span>EO MEMBER</span>
                    </div>
                    <h3 className="directory-card-name">{m.name}</h3>
                    <div className="directory-card-role">{m.role}</div>
                    <div className="directory-card-company">{m.company}</div>
                    <div className="directory-card-industry">
                      <span className="directory-tag">{m.industry}</span>
                    </div>
                  </div>
                  <button
                    type="button"
                    className="directory-card-action"
                    disabled
                    aria-label="Locked, members only"
                  >
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                      <rect x="3" y="6.5" width="8" height="6" rx="1" stroke="currentColor" strokeWidth="1.3" />
                      <path d="M5 6.5V4a2 2 0 014 0v2.5" stroke="currentColor" strokeWidth="1.3" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* JOIN CTA */}
      <section className="section section--dark">
        <div className="container container--text" style={{ textAlign: "center" }}>
          <Reveal>
            <span className="eyebrow eyebrow--on-dark">Want to reach them?</span>
            <h2 className="display-2" style={{ marginTop: 16, marginBottom: 24, color: "#fff" }}>
              Members get direct introductions
            </h2>
            <p
              className="lead"
              style={{
                color: "var(--text-on-dark-muted)",
                marginBottom: 32,
                maxWidth: 580,
                margin: "0 auto 32px",
              }}
            >
              The full directory, with email and phone for every member, is unlocked once you join. Members also get warm intros to any of the 20,000 EO members worldwide.
            </p>
            <Link href="/join" className="btn btn--primary btn--lg">
              Apply for membership →
            </Link>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
