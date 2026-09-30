import type { Metadata } from "next";

/** Personal progress surface — private, not for search engines. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default function ProgressLayout({ children }: { children: React.ReactNode }) {
  return children;
}
