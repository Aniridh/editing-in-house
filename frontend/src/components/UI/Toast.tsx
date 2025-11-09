import React, { useEffect } from "react";

interface ToastProps {
  message: string;
  type?: "success" | "error" | "info";
  onDismiss: () => void;
  duration?: number;
}

export function Toast({ message, type = "info", onDismiss, duration = 3000 }: ToastProps) {
  useEffect(() => {
    const timer = setTimeout(onDismiss, duration);
    return () => clearTimeout(timer);
  }, [onDismiss, duration]);

  return (
    <div
      className={`
        px-4 py-2 rounded-lg text-sm shadow-lg
        ${type === "success" ? "bg-green-600 text-white" : ""}
        ${type === "error" ? "bg-red-600 text-white" : ""}
        ${type === "info" ? "bg-[var(--panel)] text-zinc-200 border border-[var(--border)]" : ""}
      `}
    >
      {message}
    </div>
  );
}
