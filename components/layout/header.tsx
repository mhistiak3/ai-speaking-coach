"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { House, Mic, Moon, Settings, Sun, TrendingUp, Waves } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { useSettingsStore } from "@/lib/store/settings-store";
import { useHydrated } from "@/lib/hooks/use-hydrated";
import { InstallButton } from "@/components/layout/install-button";

const NAV: { href: string; label: string; icon: LucideIcon }[] = [
  { href: "/", label: "Home", icon: House },
  { href: "/practice", label: "Practice", icon: Mic },
  { href: "/progress", label: "Progress", icon: TrendingUp },
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Compact top bar: icon-first, text minimal. */
export function AppHeader({ cta }: { cta?: React.ReactNode }) {
  const pathname = usePathname();
  const theme = useSettingsStore((s) => s.theme);
  const update = useSettingsStore((s) => s.update);
  const hydrated = useHydrated();

  return (
    <header className="sticky top-0 z-40 border-b border-edge bg-[var(--surface-solid)]/90 backdrop-blur-xl">
      <div className="mx-auto flex h-14 w-full max-w-6xl items-center gap-3 px-4">
        <Link
          href="/"
          aria-label="FluentVoice home"
          className="flex items-center gap-2.5"
        >
          <span className="flex size-8 items-center justify-center rounded-xl bg-brand">
            <Waves className="size-4.5 text-white" />
          </span>
          <span className="hidden text-[16px] font-bold tracking-tight text-ink sm:block">
            FluentVoice
          </span>
        </Link>

        <nav className="ml-4 hidden items-center gap-1 sm:flex" aria-label="Main">
          {NAV.slice(1).map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "rounded-full px-4 py-2 text-sm font-semibold transition-colors",
                pathname === item.href
                  ? "bg-brand/10 text-brand"
                  : "text-ink-soft hover:bg-black/5 hover:text-ink dark:hover:bg-white/10",
              )}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="ml-auto flex items-center gap-1.5">
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

/** App-style bottom tab bar — icons only, active indicator. */
export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav
      className="fixed inset-x-0 bottom-0 z-40 border-t border-edge bg-[var(--surface-solid)] pb-[env(safe-area-inset-bottom)] sm:hidden"
      aria-label="Primary"
    >
      <div className="flex">
        {NAV.map((item) => {
          const active = pathname === item.href;
          return (
            <Link
              key={item.href}
              href={item.href}
              aria-label={item.label}
              aria-current={active ? "page" : undefined}
              className={cn(
                "relative flex flex-1 items-center justify-center py-3.5 transition-colors",
                active ? "text-brand" : "text-ink-faint",
              )}
            >
              {active && (
                <span className="absolute top-0 left-1/2 h-[3px] w-8 -translate-x-1/2 rounded-full bg-brand" />
              )}
              <item.icon className="size-[22px]" strokeWidth={active ? 2.4 : 1.8} />
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
