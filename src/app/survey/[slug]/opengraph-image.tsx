import { ImageResponse } from "next/og";
import { getPublishedSurveyBySlug } from "@/lib/surveys";
import { surveyShareCopy } from "./share";
import { CHAPTER_DOMAIN, CHAPTER_NAME } from "@/kernel/config/chapter";

export const alt = `${CHAPTER_NAME} member survey`;
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

// EO brand tokens duplicated here so the runtime is self-contained.
const BASE_BLUE = "#0C0C31";
const EO_BLUE = "#3D46F2";
const ACCENT = "#FF6B35"; // EO Orange

export default async function Image({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const survey = await getPublishedSurveyBySlug(slug);
  const name = survey?.name ?? `${CHAPTER_NAME} survey`;
  const copy = surveyShareCopy(slug, survey?.name ?? null);

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
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
            {`${CHAPTER_NAME} · ${name}`}
          </div>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
          <div
            style={{
              display: "flex",
              fontSize: "80px",
              fontWeight: 700,
              lineHeight: 1.05,
              letterSpacing: "-0.02em",
              maxWidth: "1040px",
            }}
          >
            {copy.headline}
          </div>
          <div
            style={{
              display: "flex",
              fontSize: "32px",
              lineHeight: 1.3,
              color: "rgba(255,255,255,0.78)",
              maxWidth: "980px",
            }}
          >
            {copy.description}
          </div>
        </div>

        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            fontSize: "22px",
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          <div
            style={{
              display: "flex",
              padding: "14px 28px",
              borderRadius: "999px",
              background: EO_BLUE,
              color: "#fff",
              fontWeight: 700,
            }}
          >
            Take the survey · 2 minutes
          </div>
          <div style={{ display: "flex", color: "rgba(255,255,255,0.5)" }}>
            {CHAPTER_DOMAIN}
          </div>
        </div>
      </div>
    ),
    { ...size },
  );
}
