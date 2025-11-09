import React from "react";
import { clsx } from "clsx";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary";
  children: React.ReactNode;
  as?: "button" | "span";
}

export function Button({ variant = "primary", className, children, as = "button", ...props }: ButtonProps) {
  const Component = as;
  return (
    <Component
      className={clsx(
        "px-3 py-1.5 text-xs font-medium rounded transition-colors",
        variant === "primary"
          ? "bg-[var(--accent)] hover:bg-[#6b75ff] text-white"
          : "bg-[var(--panel)] hover:bg-[#1a1f2e] text-zinc-200 border border-[var(--border)]",
        className
      )}
      {...props}
    >
      {children}
    </Component>
  );
}
