import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Providers } from "@/components/layout/providers";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "FluentVoice — AI Speaking Coach",
    template: "%s · FluentVoice",
  },
  description:
    "Practice speaking any language with a natural AI voice partner. Real conversations, pronunciation feedback, and gentle corrections — not quizzes.",
  applicationName: "FluentVoice",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "FluentVoice",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f4f6fb" },
    { media: "(prefers-color-scheme: dark)", color: "#05070f" },
  ],
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
};

/** Runs before first paint: applies saved theme + mobile class. */
const themeInit = `
try {
  var raw = localStorage.getItem("asc.settings.v1");
  var theme = raw ? (JSON.parse(raw).state || {}).theme : null;
  var prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
  if (theme === "dark" || (!theme && prefersDark)) document.documentElement.classList.add("dark");
} catch (e) {}
`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInit }} />
      </head>
      <body className="app-bg antialiased">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
