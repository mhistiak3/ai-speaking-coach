"use client";

import {
  forwardRef,
  type ButtonHTMLAttributes,
} from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost" | "danger" | "outline";
type Size = "sm" | "md" | "lg";

const variants: Record<Variant, string> = {
  primary:
    "bg-brand text-white hover:bg-brand/90 active:bg-brand/95",
  secondary:
    "glass text-ink hover:border-edge-strong",
  ghost: "text-ink-soft hover:text-ink hover:bg-black/5 dark:hover:bg-white/5",
  danger: "bg-bad/15 text-bad border border-bad/30 hover:bg-bad/25",
  outline: "border border-edge-strong text-ink hover:bg-black/5 dark:hover:bg-white/5",
};

const sizes: Record<Size, string> = {
  sm: "h-9 px-3.5 text-sm rounded-xl gap-1.5",
  md: "h-11 px-5 text-sm rounded-2xl gap-2",
  lg: "h-13 px-7 text-base rounded-2xl gap-2.5 py-3.5",
};

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", type = "button", ...props }, ref) => (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex select-none items-center justify-center font-semibold transition-all duration-150",
        "disabled:pointer-events-none disabled:opacity-45 active:scale-[0.98]",
        variants[variant],
        sizes[size],
        className,
      )}
      {...props}
    />
  ),
);
Button.displayName = "Button";
