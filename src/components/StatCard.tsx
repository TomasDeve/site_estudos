import type { ReactNode } from "react";
import { Card } from "./Card";

interface Props {
  icon: ReactNode;
  label: string;
  value: ReactNode;
  sub?: ReactNode;
}

export function StatCard({ icon, label, value, sub }: Props) {
  return (
    <Card className="px-4 py-3.5">
      <div className="flex items-center gap-3">
        <div className="flex size-10 shrink-0 items-center justify-center rounded-xl bg-navy-700 text-lg">
          {icon}
        </div>
        <div className="min-w-0">
          <p className="truncate text-[11px] font-medium uppercase tracking-wider text-mut">
            {label}
          </p>
          <p className="text-lg font-bold leading-tight text-txt">{value}</p>
          {sub && <p className="text-[11px] text-mut">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}
