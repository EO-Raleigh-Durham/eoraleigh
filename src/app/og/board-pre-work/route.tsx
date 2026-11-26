import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";
import { PREWORK_DEADLINE } from "@/lib/board-prework";
import { CHAPTER_DOMAIN, CHAPTER_TIME_ZONE } from "@/kernel/config/chapter";

// Share card for the board pre-work worksheet. The worksheet itself is behind
// the board login, so link previews read this image through the login page's
// metadata (see /admin/login). It is public and carries no answers: only the
// worksheet's name, its motto and the due date.

// Rendered once at build time: nothing in it depends on the request.
export const dynamic = "force-static";

// EO brand tokens duplicated here so the runtime is self-contained.
const BASE_BLUE = "#0C0C31";
const EO_BLUE = "#3D46F2";
const STRIPE = ["#3D46F2", "#FF346E", "#1EA691", "#FA653C"];

// "Wednesday 25 November": the last day the form is open, in the chapter's time zone.
const dueDay = new Date(new Date(PREWORK_DEADLINE).getTime() - 1).toLocaleDateString("en-GB", {
  weekday: "long",
  day: "numeric",
  month: "long",
  timeZone: CHAPTER_TIME_ZONE,
});

export async function GET() {
  const logo = await readFile(join(process.cwd(), "public/logo/white.svg"));
  const logoSrc = `data:image/svg+xml;base64,${logo.toString("base64")}`;

  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          background: `linear-gradient(135deg, ${BASE_BLUE} 0%, #1a1a4d 100%)`,
          color: "#fff",
          fontFamily: "sans-serif",
        }}
      >
        <div
          style={{
            flex: 1,
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            padding: "64px 80px 52px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={logoSrc} width={222} height={72} alt="" />
            <div
              style={{
                display: "flex",
                fontSize: "24px",
                letterSpacing: "0.18em",
                textTransform: "uppercase",
                color: "rgba(255,255,255,0.7)",
              }}
            >
              Board pre-work · FY2027–2028
            </div>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: "28px" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: "96px",
                fontWeight: 700,
                lineHeight: 1.04,
                letterSpacing: "-0.02em",
              }}
            >
              <div style={{ display: "flex" }}>Lead to serve.</div>
              <div style={{ display: "flex", color: "#8f95ff" }}>Build to last.</div>
            </div>
            <div
              style={{
                display: "flex",
                fontSize: "32px",
                lineHeight: 1.3,
                color: "rgba(255,255,255,0.78)",
                maxWidth: "960px",
              }}
            >
              Ten questions on what we expect from our Board and our President. 20 to 25 minutes.
            </div>
          </div>

          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                padding: "14px 28px",
                borderRadius: "999px",
                background: EO_BLUE,
                fontSize: "28px",
                fontWeight: 700,
              }}
            >
              Due {dueDay}
            </div>
            <div style={{ display: "flex", fontSize: "24px", color: "rgba(255,255,255,0.55)" }}>
              {CHAPTER_DOMAIN}/board/pre-work
            </div>
          </div>
        </div>

        <div style={{ display: "flex", height: "14px" }}>
          {STRIPE.map((color) => (
            <div key={color} style={{ flex: 1, background: color }} />
          ))}
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
