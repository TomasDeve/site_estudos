import type { ReactNode } from "react";

interface Props {
  icon?: string;
  title: string;
  message?: string;
  action?: ReactNode;
}

export function EmptyState({ icon = "🗂️", title, message, action }: Props) {
  return (
    <div className="flex flex-col items-center justify-center rounded-card border border-dashed border-line/70 bg-navy-800/40 px-6 py-12 text-center">
      <span className="text-4xl">{icon}</span>
      <h3 className="mt-3 text-sm font-semibold text-txt">{title}</h3>
      {message && <p className="mt-1 max-w-sm text-xs leading-relaxed text-mut">{message}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  );
}
