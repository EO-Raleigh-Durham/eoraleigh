"use client";

import { useEffect, useState } from "react";

type Remaining = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

export function Rise4Countdown({ startsAt }: { startsAt: string }) {
  const [remaining, setRemaining] = useState<Remaining | null>(null);
  const [started, setStarted] = useState(false);

  useEffect(() => {
    const target = new Date(startsAt).getTime();
    if (!Number.isFinite(target)) return;

    const tick = () => {
      const distance = target - Date.now();

      if (distance <= 0) {
        setStarted(true);
        setRemaining(null);
        return;
      }

      setRemaining({
        days: Math.floor(distance / 86_400_000),
        hours: Math.floor((distance % 86_400_000) / 3_600_000),
        minutes: Math.floor((distance % 3_600_000) / 60_000),
        seconds: Math.floor((distance % 60_000) / 1_000),
      });
    };

    tick();
    const timer = window.setInterval(tick, 1_000);
    return () => window.clearInterval(timer);
  }, [startsAt]);

  if (started) {
    return <p className="r4-countdown-note">RISE 4 has started.</p>;
  }

  const units: { label: string; value: number }[] = [
    { label: "Days", value: remaining?.days ?? 0 },
    { label: "Hours", value: remaining?.hours ?? 0 },
    { label: "Mins", value: remaining?.minutes ?? 0 },
    { label: "Secs", value: remaining?.seconds ?? 0 },
  ];

  return (
    <div className="r4-countdown" aria-label="Countdown to RISE 4">
      {units.map((unit) => (
        <div className="r4-countdown-unit" key={unit.label}>
          <span>{String(unit.value).padStart(2, "0")}</span>
          <small>{unit.label}</small>
        </div>
      ))}
    </div>
  );
}
