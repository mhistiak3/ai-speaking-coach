import type { Metadata } from "next";

/** Private app surfaces — hide session/word screens from search engines. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function PracticeSessionLayout({ children }: { children: React.ReactNode }) {
  return children;
}
