import type { Metadata } from "next";

/** Private settings surface — not for search engines. */
export const metadata: Metadata = {
  title: "Settings",
  description: "Tune your languages, AI voice, and coaching preferences.",
  robots: { index: false, follow: false },
};

export default function SettingsLayout({ children }: { children: React.ReactNode }) {
  return children;
}
