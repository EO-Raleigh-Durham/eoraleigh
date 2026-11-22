const STATS = [
  { num: "~20,568", label: "Members & Accelerator participants worldwide" },
  { num: "226", label: "Chapters" },
  { num: "61", label: "Countries with chapters" },
  { num: "$4M", label: "Median member sales" },
];

export function StatsRibbon() {
  const looped = [...STATS, ...STATS, ...STATS];
  return (
    <section className="stats-marquee">
      <div className="stats-marquee-label">
        <span className="eyebrow">EO by the numbers</span>
      </div>
      <div className="stats-marquee-track-wrap">
        <div className="stats-marquee-track">
          {looped.map((s, i) => (
            <div className="stats-marquee-item" key={i}>
              <span className="mono stats-marquee-num">{s.num}</span>
              <span className="stats-marquee-text">{s.label}</span>
              <span className="stats-marquee-bullet">●</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
