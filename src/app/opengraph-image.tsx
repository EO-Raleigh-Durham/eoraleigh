import { ImageResponse } from "next/og";
import { CHAPTER_COUNTRY, CHAPTER_DOMAIN, CHAPTER_NAME } from "@/kernel/config/chapter";

export const alt = `${CHAPTER_NAME}, a private community of 7-figure founders`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// EO brand tokens duplicated here so the runtime is self-contained.
const BASE_BLUE = "#0C0C31";
const EO_BLUE = "#3D46F2";
const ACCENT = "#FF6B35"; // EO Orange

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "80px",
          background: `linear-gradient(135deg, ${BASE_BLUE} 0%, #1a1a4d 100%)`,
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "20px" }}>
          <div
            style={{
              width: "20px",
              height: "20px",
              borderRadius: "50%",
              background: ACCENT,
            }}
          />
          <div
            style={{
              display: "flex",
              fontSize: "28px",
              letterSpacing: "0.18em",
              textTransform: "uppercase",
              color: "rgba(255,255,255,0.7)",
            }}
          >
            {CHAPTER_NAME}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "32px" }}>
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              fontSize: "84px",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: "1000px",
            }}
          >
            <div style={{ display: "flex" }}>Master Growth,</div>
            <div style={{ display: "flex", color: EO_BLUE }}>Multiply Impact</div>
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "32px",
              lineHeight: 1.3,
              color: "rgba(255,255,255,0.75)",
              maxWidth: "900px",
            }}
          >
            A private community of 7-figure founders in {CHAPTER_COUNTRY}, part of a 20,000-member global network.
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "22px",
            color: "rgba(255,255,255,0.5)",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <div style={{ display: "flex" }}>{CHAPTER_DOMAIN}</div>
          <div style={{ display: "flex" }}>Entrepreneurs&apos; Organization</div>
        </div>
      </div>
    ),
    { ...size }
  );
}
