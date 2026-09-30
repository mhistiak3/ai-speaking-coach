import type { CSSProperties } from "react";
import { ImageResponse } from "next/og";

/**
 * Open Graph / Twitter card image (1200×630).
 * Flat & on-brand — no gradients, single indigo accent.
 * Shared by app/opengraph-image.tsx and app/twitter-image.tsx.
 */

const bg = "#0a0d14";
const card = "#111725";
const edge = "#232c40";
const ink = "#f2f4f8";
const soft = "#a7b0c4";
const faint = "#677182";
const brand = "#818cf8";
const brandDeep = "#4f46e5";

const root: CSSProperties = {
  width: "100%",
  height: "100%",
  display: "flex",
  flexDirection: "column",
  justifyContent: "space-between",
  padding: "72px 80px",
  background: bg,
  fontFamily: "sans-serif",
};

export function buildOgResponse() {
  return new ImageResponse(
    (
      <div style={root}>
        {/* top: brand row */}
        <div style={{ display: "flex", alignItems: "center", gap: 28 }}>
          <div
            style={{
              width: 92,
              height: 92,
              borderRadius: 26,
              background: brandDeep,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexDirection: "column",
              gap: 10,
            }}
          >
            <div style={{ width: 44, height: 8, borderRadius: 8, background: "#fff", opacity: 0.95 }} />
            <div style={{ width: 32, height: 8, borderRadius: 8, background: "#fff", opacity: 0.75 }} />
            <div style={{ width: 44, height: 8, borderRadius: 8, background: "#fff", opacity: 0.95 }} />
          </div>
          <div style={{ display: "flex", flexDirection: "column" }}>
            <div
              style={{
                display: "flex",
                flexDirection: "row",
                fontSize: 44,
                fontWeight: 800,
                color: ink,
                letterSpacing: -1,
              }}
            >
              <span style={{ color: ink }}>Fluent</span>
              <span style={{ color: brand }}>Voice</span>
            </div>
            <div
              style={{
                fontSize: 20,
                fontWeight: 600,
                color: faint,
                letterSpacing: 4,
                marginTop: 4,
              }}
            >
              AI SPEAKING COACH
            </div>
          </div>
        </div>

        {/* middle: headline */}
        <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
          <div style={{ fontSize: 84, fontWeight: 800, color: ink, letterSpacing: -3, lineHeight: 1.05 }}>
            Stop studying.
          </div>
          <div style={{ fontSize: 84, fontWeight: 800, letterSpacing: -3, lineHeight: 1.05, color: brand }}>
            Start speaking.
          </div>
          <div style={{ fontSize: 30, color: soft, marginTop: 10, lineHeight: 1.4 }}>
            A real-time voice conversation with an AI that listens,
          </div>
          <div style={{ fontSize: 30, color: soft, lineHeight: 1.4 }}>
            answers out loud, and coaches your pronunciation.
          </div>
        </div>

        {/* bottom: feature chips */}
        <div style={{ display: "flex", gap: 18 }}>
          {["Voice-first practice", "16 real-life scenarios", "Honest pronunciation coaching", "Free · No signup"].map(
            (label) => (
              <div
                key={label}
                style={{
                  display: "flex",
                  alignItems: "center",
                  padding: "14px 26px",
                  borderRadius: 999,
                  border: `2px solid ${edge}`,
                  background: card,
                  color: ink,
                  fontSize: 23,
                  fontWeight: 600,
                }}
              >
                {label}
              </div>
            ),
          )}
        </div>
      </div>
    ),
    {
      width: 1200,
      height: 630,
      headers: {
        "Cache-Control": "public, max-age=86400, s-maxage=86400",
      },
    },
  );
}

export const OG_ALT =
  "FluentVoice — practice speaking a language with an AI voice partner. Real conversations, pronunciation coaching, gentle corrections.";
