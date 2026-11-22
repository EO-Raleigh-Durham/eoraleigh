"use client";

import { useState } from "react";

// One QR card: the code itself (rendered from a server-built SVG string), the
// shareable link, a copy button, and a PNG download for posters / slides.
// Used twice on the Overview — Register and Feedback.

export function QrActions({
  label,
  url,
  svg,
  filename,
  disabled,
  disabledNote,
}: {
  label: string;
  url: string;
  svg: string | null;
  filename: string;
  disabled?: boolean;
  disabledNote?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  }

  function downloadPng() {
    if (!svg) return;
    // Scale the QR up so the PNG is crisp on a projector or printed poster.
    const big = svg.replace(
      /width="\d+" height="\d+"/,
      'width="1024" height="1024"',
    );
    const svgBlob = new Blob([big], { type: "image/svg+xml;charset=utf-8" });
    const svgUrl = URL.createObjectURL(svgBlob);
    const img = new Image();
    img.onload = () => {
      const size = 1024;
      const canvas = document.createElement("canvas");
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.fillStyle = "#FFFFFF";
      ctx.fillRect(0, 0, size, size);
      ctx.drawImage(img, 0, 0, size, size);
      URL.revokeObjectURL(svgUrl);
      canvas.toBlob((b) => {
        if (!b) return;
        const a = document.createElement("a");
        const dl = URL.createObjectURL(b);
        a.href = dl;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(dl);
      }, "image/png");
    };
    img.src = svgUrl;
  }

  return (
    <div className={`hub-qr-card${disabled ? " is-disabled" : ""}`}>
      <div className="hub-qr-label">{label}</div>
      {disabled ? (
        <div className="hub-qr-off">
          <p>{disabledNote ?? "Not available yet"}</p>
        </div>
      ) : (
        <>
          {svg && (
            <div
              className="hub-qr-img"
              aria-label={`QR code for ${label}`}
              dangerouslySetInnerHTML={{ __html: svg }}
            />
          )}
          <a
            href={url}
            target="_blank"
            rel="noreferrer"
            className="hub-qr-url"
          >
            {url}
          </a>
          <div className="hub-qr-btns">
            <button type="button" className="admin-btn admin-btn--ghost" onClick={copy}>
              {copied ? "Copied" : "Copy link"}
            </button>
            <button type="button" className="admin-btn admin-btn--ghost" onClick={downloadPng}>
              Download PNG
            </button>
          </div>
        </>
      )}
    </div>
  );
}
