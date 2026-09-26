"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Mic, Moon, Settings, Sun, TrendingUp, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { InstallButton } from "@/components/layout/install-button";

interface NavItem {
  href: string;
  label: string;
}

const NAV: NavItem[] = [
  { href: "/practice", label: "Practice" },
  { href: "/progress", label: "Progress" },
  { href: "/settings", label: "Settings" },
];

export function AppHeader({ cta }: { cta?: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useSettingsStore((s) => s.theme);
  const update = useSettingsStore((s) => s.update);
  const hydrated = useHydrated();

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-[var(--bg)]/70 backdrop-blur-xl">
      <div className="mx-auto flex h-16 w-full max-w-6xl items-center gap-4 px-4 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="FluentVoice home">
          <span className="flex size-9 items-center justify-center rounded-2xl btn-gradient shadow-lg shadow-brand/30">
            <Waves className="size-5 text-white" />
          </span>
          <span className="text-[17px] font-extrabold tracking-tight text-ink">
            Fluent<span className="text-gradient">Voice</span>
          </span>
        </Link>

        <nav className="ml-6 hidden items-center gap-1 sm:flex" aria-label="Main">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                pathname?.startsWith(item.href)
                  ? "bg-brand/12 text-brand"
                  : "text-ink-soft hover:bg-black/5 hover:text-ink dark:hover:bg-white/10",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-2">
          <InstallButton />
          <button
            onClick={() => update({ theme: theme === "dark" ? "light" : "dark" })}
            aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
            className="rounded-full p-2.5 text-ink-soft transition-colors hover:bg-black/5 hover:text-ink dark:hover:bg-white/10"
          >
            {hydrated && theme === "dark" ? (
              <Sun className="size-[18px]" />
            ) : hydrated ? (
              <Moon className="size-[18px]" />
            ) : (
              <span className="size-[18px]" aria-hidden />
            )}
          </button>
          {cta}
        </div>
      </div>
    </header>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  const items: { href: string; label: string; icon: LucideIcon }[] = [
    { href: "/", label: "Home", icon: House },
    { href: "/practice", label: "Practice", icon: Mic },
    { href: "/progress", label: "Progress", icon: TrendingUp },
    { href: "/settings", label: "Settings", icon: Settings },
  ];
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 flex border-t border-edge bg-[var(--surface)] pb-[env(safe-area-inset-bottom)] backdrop-blur-xl sm:hidden"
      aria-label="Mobile"
    >
      {items.map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "flex flex-1 flex-col items-center gap-1 py-2.5 text-[10px] font-semibold",
            pathname === item.href ? "text-brand" : "text-ink-faint",
          )}
        >
          <item.icon className="size-5" />
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
