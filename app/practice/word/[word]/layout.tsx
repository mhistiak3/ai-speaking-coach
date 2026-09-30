import type { Metadata } from "next";

/** Private word-practice surface — not for search engines. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function WordPracticeLayout({ children }: { children: React.ReactNode }) {
  return children;
}
