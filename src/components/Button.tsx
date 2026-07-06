import type { ButtonHTMLAttributes } from "react";
import { Spinner } from "./Spinner";

type Variant = "primary" | "secondary" | "ghost" | "danger";
type Size = "sm" | "md";

const variants: Record<Variant, string> = {
  primary:
    "bg-gold text-navy-950 font-semibold hover:bg-gold-soft active:scale-[0.98] shadow-[0_2px_12px_rgb(224_168_62/0.25)]",
  secondary:
    "bg-navy-700 text-txt border border-line hover:bg-navy-600 active:scale-[0.98]",
  ghost: "text-dim hover:text-txt hover:bg-navy-700/60",
  danger: "bg-red/15 text-red border border-red/30 hover:bg-red/25",
};

const sizes: Record<Size, string> = {
  sm: "h-8 px-3 text-sm rounded-lg gap-1.5",
  md: "h-10 px-4 text-sm rounded-xl gap-2",
};

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
  loading?: boolean;
}

export function Button({
  variant = "primary",
  size = "md",
  loading = false,
  className = "",
  children,
  disabled,
  ...rest
}: Props) {
  return (
    <button
      className={`inline-flex cursor-pointer items-center justify-center transition-all disabled:cursor-not-allowed disabled:opacity-50 ${variants[variant]} ${sizes[size]} ${className}`}
      disabled={disabled || loading}
      {...rest}
    >
      {loading && <Spinner className="size-4" />}
      {children}
    </button>
  );
}
