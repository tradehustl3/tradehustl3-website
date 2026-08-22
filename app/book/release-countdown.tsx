"use client";

import { useEffect, useState } from "react";

const RELEASE_TIME = new Date("2026-09-15T00:00:00Z").getTime();

type RemainingTime = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

function getRemainingTime(): RemainingTime | null {
  const difference = RELEASE_TIME - Date.now();

  if (difference <= 0) return null;

  return {
    days: Math.floor(difference / 86_400_000),
    hours: Math.floor((difference / 3_600_000) % 24),
    minutes: Math.floor((difference / 60_000) % 60),
    seconds: Math.floor((difference / 1_000) % 60),
  };
}

export default function ReleaseCountdown() {
  const [remaining, setRemaining] = useState<RemainingTime | undefined>();

  useEffect(() => {
    const updateCountdown = () => setRemaining(getRemainingTime());
    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1_000);

    return () => window.clearInterval(timer);
  }, []);

  if (remaining === null) {
    return <p className="release-live">TRADE HUSTL3 is now available.</p>;
  }

  const units = [
    [remaining?.days, "Days"],
    [remaining?.hours, "Hours"],
    [remaining?.minutes, "Minutes"],
    [remaining?.seconds, "Seconds"],
  ] as const;

  return (
    <div className="release-countdown" role="timer" aria-label="Time until the September 15, 2026 release">
      {units.map(([value, label]) => (
        <span key={label}>
          <strong>{value === undefined ? "--" : String(value).padStart(2, "0")}</strong>
          <small>{label}</small>
        </span>
      ))}
    </div>
  );
}
