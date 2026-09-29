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
    <Card className="px-3 py-3 sm:px-4 sm:py-3.5">
      <div className="flex items-center gap-2.5 sm:gap-3">
        <div className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-navy-700 text-base sm:size-10 sm:rounded-xl sm:text-lg">
          {icon}
        </div>
        <div className="min-w-0">
          {/* No celular o rótulo quebra em até 2 linhas em vez de virar "QUESTÕES H…" */}
          <p className="line-clamp-2 text-[10px] font-medium uppercase leading-tight tracking-wide text-mut sm:text-[11px] sm:tracking-wider">
            {label}
          </p>
          <p className="text-lg font-bold leading-tight text-txt">{value}</p>
          {sub && <p className="text-[11px] text-mut">{sub}</p>}
        </div>
      </div>
    </Card>
  );
}
