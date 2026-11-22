"use client";

import dynamic from "next/dynamic";
import { useCallback, useRef } from "react";

const Scanner = dynamic(
  () => import("@yudiel/react-qr-scanner").then((module) => module.Scanner),
  { ssr: false },
);

type Props = {
  onScan: (value: string) => void;
  onError: () => void;
  paused?: boolean;
};

export function QrCamera({ onScan, onError, paused = false }: Props) {
  const lastScan = useRef<{ value: string; time: number } | null>(null);

  const handleScan = useCallback(
    (codes: Array<{ rawValue: string }>) => {
      const value = codes[0]?.rawValue;
      if (!value) return;
      const now = Date.now();
      if (
        lastScan.current?.value === value &&
        now - lastScan.current.time < 1500
      ) {
        return;
      }
      lastScan.current = { value, time: now };
      onScan(value);
    },
    [onScan],
  );

  return (
    <div className="chk-camera-viewport">
      <Scanner
        onScan={handleScan}
        onError={onError}
        paused={paused}
        scanDelay={500}
        allowMultiple
        formats={["qr_code"]}
        constraints={{ facingMode: { ideal: "environment" } }}
        components={{ finder: true, torch: false }}
        styles={{
          container: { width: "100%", height: "100%" },
          video: { width: "100%", height: "100%", objectFit: "cover" },
        }}
      />
    </div>
  );
}
