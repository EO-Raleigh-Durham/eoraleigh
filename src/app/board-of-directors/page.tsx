import Link from "next/link";
import { Reveal } from "@/components/Reveal";
import { pageMeta } from "@/lib/page-metadata";
import { getCurrentBoard, type BoardCard } from "@/lib/board";
import { CHAPTER_DOMAIN, CHAPTER_NAME } from "@/kernel/config/chapter";

export const metadata = pageMeta({
  title: "Board",
  description:
    `${CHAPTER_NAME} is run by its members. Nine elected board positions, two-year terms. Meet the founders who run this place.`,
  path: "/board-of-directors",
});

// Board roster is data-driven (board_appointments + member_photos). Always
// reflect the latest term from the DB.
export const dynamic = "force-dynamic";

function initials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("");
}

export default async function BoardPage() {
  const board = await getCurrentBoard();
  const president = board?.president ?? null;
  const rest: BoardCard[] = board?.rest ?? [];
  const fyLabel = board?.fyLabel ?? "";

  return (
    <div className="board-page">
      {/* HERO */}
      <section className="section section--hero section--dark board-hero">
        <div className="container">
          <Reveal>
            <span className="eyebrow eyebrow--on-dark">{CHAPTER_NAME} board</span>
            <h1 className="display-1" style={{ marginTop: 16, marginBottom: 24, color: "#fff" }}>
              The volunteers
              <br />
              <span style={{ color: "var(--accent)" }}>who run this place</span>
            </h1>
            <p className="lead" style={{ color: "var(--text-on-dark-muted)", maxWidth: 680 }}>
              {CHAPTER_NAME} is run by its members. Nine elected positions, two-year terms, no salary. They are the founders who decide what the chapter does, who joins, and how we grow.
            </p>
          </Reveal>
        </div>
      </section>

      {/* PRESIDENT FEATURE */}
      {president && (
        <section className="section">
          <div className="container">
            <Reveal className="board-president">
              <div className="board-president-img">
                {president.photoUrl ? (
                  <img src={president.photoUrl} alt={president.name} />
                ) : (
                  <div className="board-avatar-placeholder">{initials(president.name)}</div>
                )}
              </div>
              <div className="board-president-body">
                <div className="caption mono" style={{ color: "var(--accent)", marginBottom: 16 }}>
                  {president.title.toUpperCase()}
                  {fyLabel ? ` · ${fyLabel}` : ""}
                </div>
                <h2 className="display-3" style={{ marginBottom: 16 }}>
                  {president.name}
                </h2>
                {president.headline && (
                  <div className="lead text-muted" style={{ marginBottom: 24 }}>
                    {president.headline}
                  </div>
                )}
                {president.bio && <p className="body">{president.bio}</p>}
              </div>
            </Reveal>
          </div>
        </section>
      )}

      {/* BOARD GRID */}
      {rest.length > 0 && (
        <section className="section section--alt">
          <div className="container">
            <Reveal>
              <span className="eyebrow eyebrow--accent">The full board</span>
              <h2 className="display-3" style={{ marginTop: 12, marginBottom: 56 }}>
                {fyLabel ? `${fyLabel} term` : "The board"}
              </h2>
            </Reveal>

            <div className="board-grid">
              {rest.map((m, i) => (
                <Reveal key={`${m.roleKey}-${m.name}`} delay={i * 60} className="board-card">
                  <div className="board-card-img">
                    {m.photoUrl ? (
                      <img src={m.photoUrl} alt={m.name} />
                    ) : (
                      <div className="board-avatar-placeholder">{initials(m.name)}</div>
                    )}
                  </div>
                  <div className="board-card-body">
                    <div className="caption mono" style={{ color: "var(--accent)", marginBottom: 8 }}>
                      {m.title.toUpperCase()}
                    </div>
                    <h3 className="heading-2" style={{ marginBottom: 6 }}>
                      {m.name}
                    </h3>
                    {m.headline && (
                      <div className="caption text-muted" style={{ marginBottom: 16 }}>
                        {m.headline}
                      </div>
                    )}
                    {m.bio && (
                      <p className="body-sm" style={{ color: "var(--text-muted)" }}>
                        {m.bio}
                      </p>
                    )}
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* GET INVOLVED */}
      <section className="section">
        <div className="container container--text" style={{ textAlign: "center" }}>
          <Reveal>
            <span className="eyebrow eyebrow--accent">For members</span>
            <h2 className="display-3" style={{ marginTop: 12, marginBottom: 20 }}>
              Want to serve on the board?
            </h2>
            <p
              className="lead text-muted"
              style={{ marginBottom: 32, maxWidth: 620, margin: "0 auto 32px" }}
            >
              Board nominations open every September for the following two-year term. Members are eligible after two full years of attendance. The Path of Leadership is the recommended preparation.
            </p>
            <div className="row" style={{ gap: 12, justifyContent: "center", flexWrap: "wrap" }}>
              <Link href="/path-of-leadership" className="btn btn--dark">
                Path of Leadership →
              </Link>
              <a href={`mailto:nominations@${CHAPTER_DOMAIN}`} className="btn btn--ghost">
                Nominate someone
              </a>
            </div>
          </Reveal>
        </div>
      </section>
    </div>
  );
}
