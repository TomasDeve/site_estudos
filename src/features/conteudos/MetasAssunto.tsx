import { useState, type FormEvent } from "react";
import {
  BookOpen,
  Check,
  Pencil,
  Percent,
  PenLine,
  Plus,
  Snowflake,
  Target,
  Trash2,
  Trophy,
} from "lucide-react";
import { toast } from "sonner";
import type { QuestaoLog, Topico, TopicoMeta } from "@/types/db";
import {
  useAplicarPlanoPadrao,
  useAtualizarMeta,
  useCriarMeta,
  useExcluirMeta,
  useToggleMeta,
} from "@/api/topicoMetas";
import { useSetTopicoStatus } from "@/api/topicos";
import { Button } from "@/components/Button";
import { Input } from "@/components/Field";
import { avaliarMeta, placarAssunto } from "./metasTopico";

const ICONE: Record<string, typeof Target> = {
  lei: BookOpen,
  producao: PenLine,
  volume: Target,
  acerto: Percent,
  frio: Snowflake,
};

/** Os campos numéricos que cada tipo de meta usa, com o rótulo de cada um. */
const CAMPOS: Record<string, { campo: "alvo" | "janela" | "dias"; rotulo: string }[]> = {
  manual: [],
  volume: [
    { campo: "alvo", rotulo: "questões" },
    { campo: "dias", rotulo: "dias diferentes" },
  ],
  acerto: [
    { campo: "alvo", rotulo: "% de acerto" },
    { campo: "janela", rotulo: "últimas N questões" },
  ],
  frio: [
    { campo: "alvo", rotulo: "% de acerto" },
    { campo: "janela", rotulo: "questões no bloco" },
    { campo: "dias", rotulo: "dias parado" },
  ],
};

interface Props {
  topico: Topico;
  metas: TopicoMeta[];
  logs: QuestaoLog[];
}

export function MetasAssunto({ topico, metas, logs }: Props) {
  const aplicarPlano = useAplicarPlanoPadrao();
  const criar = useCriarMeta();
  const excluir = useExcluirMeta();
  const toggle = useToggleMeta();
  const atualizar = useAtualizarMeta();
  const setStatus = useSetTopicoStatus();

  const [nova, setNova] = useState("");
  const [editando, setEditando] = useState<string | null>(null);

  const placar = placarAssunto(metas, logs);
  const ordenadas = [...metas].sort((a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at));

  async function onAplicarPlano() {
    try {
      await aplicarPlano.mutateAsync([topico.id]);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  async function onNovaMeta(e: FormEvent) {
    e.preventDefault();
    const titulo = nova.trim();
    if (!titulo) return;
    try {
      await criar.mutateAsync({
        topico_id: topico.id,
        chave: `livre-${Date.now()}`,
        titulo,
        tipo: "manual",
        ordem: metas.length,
      });
      setNova("");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    }
  }

  if (metas.length === 0) {
    return (
      <div className="space-y-2">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-mut">
          Metas do assunto
        </p>
        <p className="text-xs leading-relaxed text-mut">
          Sem metas ainda. O plano padrão tem 5: ler a lei, produzir um resumo, 20 questões em 2
          dias, 85% nas últimas 20 e o teste frio. As três últimas se marcam sozinhas pelo seu
          histórico de questões.
        </p>
        <Button size="sm" variant="secondary" loading={aplicarPlano.isPending} onClick={onAplicarPlano}>
          <Plus className="size-3.5" /> Aplicar plano padrão
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-wide text-mut">
          Metas do assunto
        </p>
        <span
          className={`text-xs font-bold tabular-nums ${
            placar.fechado ? "text-green" : "text-dim"
          }`}
        >
          {placar.feitas}/{placar.total}
        </span>
      </div>

      <ul className="space-y-1">
        {ordenadas.map((m) => {
          const estado = avaliarMeta(m, logs);
          const Icone = ICONE[m.chave] ?? Target;
          const auto = m.tipo !== "manual";
          // Automática que o histórico já provou: o check é só um espelho.
          const travada = auto && estado.concluida && !estado.forcada;

          if (editando === m.id) {
            return (
              <li key={m.id} className="rounded-lg border border-gold/40 bg-navy-950/60 p-2">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    const form = e.currentTarget;
                    const dados = new FormData(form);
                    const titulo = String(dados.get("titulo") ?? "").trim();
                    if (!titulo) return;
                    const patch: Record<string, string | number | null> = { titulo };
                    for (const { campo } of CAMPOS[m.tipo] ?? []) {
                      const bruto = String(dados.get(campo) ?? "").trim();
                      patch[campo] = bruto === "" ? null : Number(bruto);
                    }
                    atualizar.mutate({ id: m.id, ...patch });
                    setEditando(null);
                  }}
                  className="space-y-2"
                >
                  <Input name="titulo" defaultValue={m.titulo} className="!h-8 !text-xs" autoFocus />
                  {(CAMPOS[m.tipo] ?? []).length > 0 && (
                    <div className="flex flex-wrap items-center gap-2">
                      {CAMPOS[m.tipo].map(({ campo, rotulo }) => (
                        <label key={campo} className="flex items-center gap-1.5 text-[11px] text-mut">
                          <Input
                            name={campo}
                            type="number"
                            min={0}
                            defaultValue={m[campo] ?? ""}
                            className="!h-7 w-16 !text-xs"
                          />
                          {rotulo}
                        </label>
                      ))}
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Button size="sm" type="submit" variant="secondary">
                      <Check className="size-3.5" /> Salvar
                    </Button>
                    <Button size="sm" type="button" variant="ghost" onClick={() => setEditando(null)}>
                      Cancelar
                    </Button>
                  </div>
                </form>
              </li>
            );
          }

          return (
            <li key={m.id} className="group/meta flex items-start gap-2 rounded-lg px-1 py-1 hover:bg-navy-800/50">
              <button
                onClick={() => {
                  if (travada) return;
                  toggle.mutate({ id: m.id, concluida: !m.concluida });
                }}
                disabled={travada}
                className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded border-2 transition-all ${
                  estado.concluida
                    ? "border-green bg-green text-navy-950"
                    : "border-line hover:border-gold"
                } ${travada ? "cursor-default" : "cursor-pointer hover:scale-110"}`}
                title={
                  travada
                    ? "Fecha sozinha pelo histórico de questões"
                    : m.concluida
                      ? "Desmarcar"
                      : auto
                        ? "Dar por cumprida sem esperar o histórico"
                        : "Marcar como feita"
                }
                aria-label={m.titulo}
              >
                {estado.concluida && <Check className="size-3" strokeWidth={3.5} />}
              </button>

              <div className="min-w-0 flex-1">
                <p
                  className={`flex items-center gap-1.5 text-xs leading-snug ${
                    estado.concluida ? "text-mut line-through decoration-green/50" : "text-txt"
                  }`}
                >
                  <Icone className="size-3 shrink-0 text-mut" />
                  <span className="min-w-0">{m.titulo}</span>
                </p>
                <p
                  className={`mt-0.5 text-[11px] ${
                    estado.concluida ? "text-green/70" : auto ? "text-amber/80" : "text-mut"
                  }`}
                >
                  {estado.forcada ? "dada por cumprida na mão" : estado.detalhe}
                </p>
                {auto && !estado.concluida && estado.progresso > 0 && (
                  <div className="mt-1 h-1 overflow-hidden rounded-full bg-navy-700">
                    <div
                      className="h-full rounded-full bg-amber/70 transition-all"
                      style={{ width: `${Math.round(estado.progresso * 100)}%` }}
                    />
                  </div>
                )}
              </div>

              <button
                onClick={() => setEditando(m.id)}
                className="shrink-0 cursor-pointer rounded-md p-1 text-mut opacity-0 transition-opacity hover:bg-navy-600 hover:text-dim group-hover/meta:opacity-100 max-md:opacity-100"
                title="Editar meta"
                aria-label={`Editar ${m.titulo}`}
              >
                <Pencil className="size-3" />
              </button>
              <button
                onClick={() => excluir.mutate(m.id)}
                className="shrink-0 cursor-pointer rounded-md p-1 text-mut opacity-0 transition-opacity hover:bg-red/10 hover:text-red group-hover/meta:opacity-100 max-md:opacity-100"
                title="Excluir meta"
                aria-label={`Excluir ${m.titulo}`}
              >
                <Trash2 className="size-3" />
              </button>
            </li>
          );
        })}
      </ul>

      {placar.fechado && topico.status !== "concluido" && (
        <button
          onClick={() => setStatus.mutate({ id: topico.id, status: "concluido" })}
          className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg border border-green/40 bg-green/10 px-3 py-2 text-xs font-semibold text-green transition-colors hover:bg-green/20"
        >
          <Trophy className="size-3.5" /> Todas as metas fechadas — marcar assunto como Concluído
        </button>
      )}

      <form onSubmit={onNovaMeta} className="flex items-center gap-2 border-t border-line/30 pt-2">
        <Input
          placeholder="Outra meta para este assunto..."
          value={nova}
          onChange={(e) => setNova(e.target.value)}
          className="!h-8 flex-1 !text-xs"
        />
        <Button size="sm" type="submit" variant="ghost" loading={criar.isPending}>
          <Plus className="size-3.5" /> Meta
        </Button>
      </form>
    </div>
  );
}
