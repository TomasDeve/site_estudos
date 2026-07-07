import { Link } from "react-router";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Check, GripVertical, Trash2 } from "lucide-react";
import type { CicloItem } from "@/types/db";

interface Props {
  item: CicloItem;
  index: number;
  ehAtual: boolean;
  cor: string;
  nome: string;
  icone: string;
  pct: number;
  temTopicos: boolean;
  /** Rota da página da matéria (clique no nome). */
  to: string;
  onToggle: () => void;
  onRemover: () => void;
}

export function CicloItemRow({
  item,
  index,
  ehAtual,
  cor,
  nome,
  icone,
  pct,
  temTopicos,
  to,
  onToggle,
  onRemover,
}: Props) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderColor: ehAtual && !item.concluido ? `${cor}88` : undefined,
  };

  return (
    <li
      ref={setNodeRef}
      style={style}
      className={`group relative flex items-center gap-2 rounded-xl border py-2.5 pl-1.5 pr-3 transition-colors ${
        isDragging ? "z-10 shadow-2xl ring-1 ring-line" : ""
      } ${
        item.concluido
          ? "border-green/25 bg-green/8"
          : ehAtual
            ? "border-line bg-navy-800"
            : "border-line/50 bg-navy-900/50 hover:border-line"
      }`}
    >
      {/* alça de arrastar */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex shrink-0 cursor-grab touch-none items-center justify-center rounded-md p-1 text-mut transition-colors hover:bg-navy-600 hover:text-dim active:cursor-grabbing"
        aria-label={`Arrastar ${nome} para reordenar`}
        title="Arraste para reordenar"
      >
        <GripVertical className="size-4" />
      </button>

      {/* concluir / número */}
      <button
        onClick={onToggle}
        className={`flex size-6 shrink-0 cursor-pointer items-center justify-center rounded-full border-2 transition-all ${
          item.concluido ? "border-green bg-green text-navy-950" : "border-mut hover:scale-110"
        }`}
        style={!item.concluido ? { borderColor: `${cor}99` } : undefined}
        aria-label={item.concluido ? "Desmarcar matéria" : "Concluir matéria"}
      >
        {item.concluido ? (
          <Check className="size-4" />
        ) : (
          <span className="text-[11px] font-bold tabular-nums text-dim">{index + 1}</span>
        )}
      </button>

      <Link
        to={to}
        className="group/mat flex min-w-0 flex-1 items-center gap-2 rounded-md py-0.5"
        title={`Abrir ${nome}`}
      >
        <span className="text-lg">{icone}</span>
        <div className="min-w-0 flex-1">
          <p
            className={`truncate text-sm transition-colors ${
              item.concluido ? "text-mut line-through" : "text-txt group-hover/mat:text-gold"
            }`}
          >
            {nome}
          </p>
          {temTopicos && (
            <div className="mt-1 flex items-center gap-2">
              <div className="h-1 w-24 overflow-hidden rounded-full bg-navy-900">
                <div
                  className="h-full rounded-full"
                  style={{ width: `${pct}%`, background: cor }}
                />
              </div>
              <span className="text-[10px] tabular-nums text-mut">{pct}%</span>
            </div>
          )}
        </div>
      </Link>

      <button
        onClick={onRemover}
        className="shrink-0 cursor-pointer rounded-md p-1 text-mut opacity-0 transition-opacity hover:bg-red/10 hover:text-red group-hover:opacity-100 max-md:opacity-100"
        aria-label={`Remover ${nome} do ciclo`}
      >
        <Trash2 className="size-3.5" />
      </button>
    </li>
  );
}
