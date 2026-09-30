/**
 * Central SEO config — single source for site URL, branding, and metadata.
 * Set NEXT_PUBLIC_SITE_URL in .env.local (e.g. https://yourdomain.com) so
 * absolute URLs in metadata/sitemap/robots/OG tags are correct in prod.
 */

export const SITE_URL =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, "") || "http://localhost:3000";

export const SITE_NAME = "FluentVoice";

export const SITE_TITLE = "FluentVoice — AI Speaking Coach | Practice Speaking Out Loud";

export const SITE_DESCRIPTION =
  "Practice speaking any language with a natural AI voice partner. Real conversations, pronunciation coaching, and gentle corrections — free, in your browser, no signup.";

export const SITE_KEYWORDS = [
  "ai speaking coach",
  "language practice",
  "speaking practice",
  "pronunciation practice",
  "learn english speaking",
  "voice chat ai",
  "language learning app",
  "speech recognition practice",
  "esl speaking",
  "fluency practice",
  "ai language partner",
  "pwa language app",
];

export const OG_TITLE = "FluentVoice — Stop studying. Start speaking.";
export const OG_DESCRIPTION =
  "A real-time voice conversation with an AI that listens, answers out loud, and quietly coaches your pronunciation.";
