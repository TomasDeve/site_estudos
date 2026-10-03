import { useEffect, useMemo, useState } from "react";
import { Plus, Sparkles } from "lucide-react";
import { toast } from "sonner";
import type { RotinaBloco } from "@/types/db";
import { useCriarBlocos, useRotina } from "@/api/rotina";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { FullScreenSpinner } from "@/components/Spinner";
import { fmtMinutos } from "@/lib/dates";
import { BlocoModal, type Rascunho } from "./BlocoModal";
import {
  MODELO,
  TIPOS,
  agoraNaRotina,
  blocosDoDia,
  duracao,
  fmtHora,
  passaDaMeiaNoite,
  resumoDoDia,
  tipoDe,
  tituloDe,
  vindoDeOntem,
  type Ocorrencia,
} from "./rotinaModelo";

/** Relógio da página: anda a cada 20 s e acerta na hora ao voltar para o site. */
function useAgora() {
  const [agora, setAgora] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setAgora(new Date()), 20_000);
    const aoVoltar = () => {
      if (document.visibilityState === "visible") setAgora(new Date());
    };
    document.addEventListener("visibilitychange", aoVoltar);
    return () => {
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", aoVoltar);
    };
  }, []);
  return agora;
}

type Editor = { bloco?: RotinaBloco; inicial: Rascunho } | null;

/**
 * Rotina — os horários fixos do dia (acordar, estudar, intervalos, parar, academia,
 * dormir). Em cima, o que vale AGORA e o que vem depois; embaixo, a linha do tempo
 * de cada dia da semana, com as horas livres à mostra (tocar numa preenche).
 */
export function RotinaPage() {
  const { data: blocos, isLoading } = useRotina();
  const criarModelo = useCriarBlocos();
  const agora = useAgora();
  // Rotina única (a mesma todo dia): a linha do tempo é a de hoje.
  const dia = agora.getDay();
  const [editor, setEditor] = useState<Editor>(null);

  const lista = useMemo(() => blocos ?? [], [blocos]);
  const status = useMemo(() => agoraNaRotina(lista, agora), [lista, agora]);

  if (isLoading) return <FullScreenSpinner />;

  function novo(inicio: number, fim: number, tipo = "estudo") {
    setEditor({ inicial: { tipo, titulo: "", inicio, fim } });
  }

  /** "+ Bloco": começa onde o último bloco do dia termina (ou às 8:00). */
  function novoNoFim() {
    const doDia = blocosDoDia(lista, dia).filter((b) => !passaDaMeiaNoite(b));
    const ultimoFim = doDia.reduce((m, b) => Math.max(m, b.fim), 0);
    const inicio = ultimoFim > 0 && ultimoFim < 23 * 60 ? ultimoFim : 8 * 60;
    novo(inicio, Math.min(inicio + 60, 23 * 60 + 55));
  }

  function usarModelo() {
    criarModelo.mutate(MODELO, {
      onSuccess: () => toast.success("Rotina modelo criada — toque em qualquer bloco para ajustar."),
      onError: (err) => toast.error(err instanceof Error ? err.message : String(err)),
    });
  }

  return (
    <div className="mx-auto max-w-2xl">
      <PageHeader
        title="Rotina"
        subtitle="Seus horários fixos: acordar, estudar, parar, treinar e dormir."
        action={
          lista.length > 0 && (
            <Button size="sm" onClick={novoNoFim}>
              <Plus className="size-4" />
              Bloco
            </Button>
          )
        }
      />

      {lista.length === 0 ? (
        <Card className="px-5 py-8 text-center">
          <div className="text-4xl">🗓️</div>
          <h2 className="mt-3 text-base font-semibold text-txt">Monte sua rotina</h2>
          <p className="mx-auto mt-1.5 max-w-sm text-sm text-dim">
            Uma rotina só, para seguir todos os dias. Comece por um modelo pronto (sono, 3h de
            estudo com intervalo, refeições e academia) e ajuste o que quiser — ou monte do zero.
          </p>
          <div className="mt-5 flex flex-col justify-center gap-2 sm:flex-row">
            <Button onClick={usarModelo} loading={criarModelo.isPending}>
              <Sparkles className="size-4" />
              Montar com um modelo
            </Button>
            <Button variant="secondary" onClick={() => novo(22 * 60 + 30, 6 * 60, "sono")}>
              Começar do zero
            </Button>
          </div>
        </Card>
      ) : (
        <div className="space-y-4">
          <AgoraCard atual={status.atual} proximo={status.proximo} min={status.min} />

          <ResumoDia blocos={lista} dia={dia} />

          <LinhaDoTempo
            blocos={lista}
            dia={dia}
            atual={status.atual}
            onEditar={(b) => setEditor({ bloco: b, inicial: b })}
            onNovo={novo}
          />

          <button
            onClick={novoNoFim}
            className="flex min-h-12 w-full cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-xl border border-dashed border-line/70 text-sm font-semibold text-dim transition-colors hover:border-gold/50 hover:text-gold"
          >
            <Plus className="size-4" />
            Adicionar bloco
          </button>
        </div>
      )}

      {editor && (
        <BlocoModal
          bloco={editor.bloco}
          inicial={editor.inicial}
          todos={lista}
          onClose={() => setEditor(null)}
        />
      )}
    </div>
  );
}

/** O que vale agora (com quanto falta) e o que vem em seguida. */
function AgoraCard({
  atual,
  proximo,
  min,
}: {
  atual: Ocorrencia | null;
  proximo: Ocorrencia | null;
  min: number;
}) {
  const info = atual ? TIPOS[tipoDe(atual.bloco)] : null;
  const pct = atual ? Math.min(100, ((min - atual.inicio) / (atual.fim - atual.inicio)) * 100) : 0;
  const faltam = atual ? Math.max(1, Math.round(atual.fim - min)) : proximo ? Math.round(proximo.inicio - min) : 0;
  const quando = (o: Ocorrencia) =>
    o.inicio >= 1440 ? `amanhã às ${fmtHora(o.inicio)}` : `às ${fmtHora(o.inicio)}`;

  return (
    <Card
      className="overflow-hidden"
      style={info ? { borderColor: `${info.cor}66`, background: `linear-gradient(135deg, ${info.cor}1f, transparent 70%)` } : undefined}
    >
      <div className="px-4 py-4">
        <div className="text-[11px] font-semibold uppercase tracking-wide text-mut">Agora</div>
        {atual && info ? (
          <>
            <div className="mt-1 flex items-center gap-2.5">
              <span className="text-3xl leading-none">{info.emoji}</span>
              <div className="min-w-0">
                <div className="truncate text-lg font-bold text-txt">{tituloDe(atual.bloco)}</div>
                <div className="text-xs tabular-nums text-dim">
                  até {fmtHora(atual.fim)} ·{" "}
                  <strong style={{ color: info.cor }}>faltam {fmtMinutos(faltam)}</strong>
                </div>
              </div>
            </div>
            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-navy-700">
              <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, background: info.cor }} />
            </div>
          </>
        ) : (
          <div className="mt-1 flex items-center gap-2.5">
            <span className="text-3xl leading-none">🕊️</span>
            <div>
              <div className="text-lg font-bold text-txt">Horário livre</div>
              {proximo && (
                <div className="text-xs tabular-nums text-dim">
                  {fmtMinutos(Math.max(1, faltam))} até o próximo
                </div>
              )}
            </div>
          </div>
        )}
      </div>
      {proximo && (
        <div className="flex items-center gap-2 border-t border-line/40 px-4 py-2.5 text-xs text-dim">
          <span className="text-mut">Depois:</span>
          <span>{TIPOS[tipoDe(proximo.bloco)].emoji}</span>
          <span className="min-w-0 truncate font-semibold text-txt">{tituloDe(proximo.bloco)}</span>
          <span className="ml-auto shrink-0 tabular-nums">
            {quando(proximo)} · em {fmtMinutos(Math.max(1, Math.round(proximo.inicio - min)))}
          </span>
        </div>
      )}
    </Card>
  );
}

/** Acorda/dorme/sono e quanto do dia vai para estudo, academia… */
function ResumoDia({ blocos, dia }: { blocos: RotinaBloco[]; dia: number }) {
  const r = resumoDoDia(blocos, dia);
  const chips: string[] = [];
  if (r.acorda !== null) chips.push(`☀️ Acorda ${fmtHora(r.acorda)}`);
  if (r.dorme !== null) chips.push(`🌙 Dorme ${fmtHora(r.dorme)}`);
  if (r.sono !== null) chips.push(`😴 ${fmtMinutos(r.sono)} de sono`);
  for (const t of ["estudo", "academia", "intervalo"] as const) {
    const m = r.porTipo.get(t);
    if (m) chips.push(`${TIPOS[t].emoji} ${fmtMinutos(m)} de ${TIPOS[t].label.toLowerCase()}`);
  }
  if (!chips.length) return null;
  return (
    <div className="flex flex-wrap gap-1.5">
      {chips.map((c) => (
        <span key={c} className="rounded-full border border-line/50 bg-navy-900/60 px-2.5 py-1 text-[11px] text-dim">
          {c}
        </span>
      ))}
    </div>
  );
}

/**
 * Linha do tempo do dia: o "acordar" (fim do sono que veio da véspera), os blocos
 * por horário e as horas livres entre eles — tocar numa hora livre cria um bloco nela.
 */
function LinhaDoTempo({
  blocos,
  dia,
  atual,
  onEditar,
  onNovo,
}: {
  blocos: RotinaBloco[];
  dia: number;
  atual: Ocorrencia | null;
  onEditar: (b: RotinaBloco) => void;
  onNovo: (inicio: number, fim: number) => void;
}) {
  const doDia = blocosDoDia(blocos, dia);
  const ontem = vindoDeOntem(blocos, dia);
  const linhas: React.ReactNode[] = [];
  let cursor: number | null = ontem ? ontem.fim : null;

  if (ontem) {
    const agoraAqui = atual?.bloco.id === ontem.id && atual.inicio < 0;
    linhas.push(
      <Linha
        key="ontem"
        hora={ontem.fim}
        emoji={tipoDe(ontem) === "sono" ? "☀️" : TIPOS[tipoDe(ontem)].emoji}
        titulo={tipoDe(ontem) === "sono" ? "Acordar" : `Fim de ${tituloDe(ontem)}`}
        detalhe={
          tipoDe(ontem) === "sono"
            ? `dormiu às ${fmtHora(ontem.inicio)} · ${fmtMinutos(duracao(ontem))} de sono`
            : `${fmtHora(ontem.inicio)}–${fmtHora(ontem.fim)} (começou na véspera)`
        }
        cor={TIPOS[tipoDe(ontem)].cor}
        agora={agoraAqui}
        compacta
        onClick={() => onEditar(ontem)}
      />
    );
  }

  for (const b of doDia) {
    if (cursor !== null && b.inicio - cursor >= 15) {
      const de = cursor;
      linhas.push(<Livre key={`livre-${b.id}`} de={de} ate={b.inicio} onClick={() => onNovo(de, b.inicio)} />);
    }
    const info = TIPOS[tipoDe(b)];
    const dur = duracao(b);
    linhas.push(
      <Linha
        key={b.id}
        hora={b.inicio}
        emoji={info.emoji}
        titulo={tituloDe(b)}
        detalhe={`${fmtHora(b.inicio)}–${fmtHora(b.fim)}${passaDaMeiaNoite(b) ? " (dia seguinte)" : ""} · ${fmtMinutos(dur)}`}
        cor={info.cor}
        agora={atual?.bloco.id === b.id && atual.inicio >= 0 && atual.inicio < 1440}
        altura={Math.min(120, 52 + (passaDaMeiaNoite(b) ? 0 : dur / 6))}
        onClick={() => onEditar(b)}
      />
    );
    const fimB = passaDaMeiaNoite(b) ? 1440 : b.fim;
    cursor = Math.max(cursor ?? 0, fimB);
  }

  if (doDia.length === 0) {
    linhas.push(
      <li key="vazio" className="rounded-xl border border-dashed border-line/50 px-4 py-6 text-center text-sm text-mut">
        Nada marcado ainda.
      </li>
    );
  }

  return <ul className="space-y-1.5">{linhas}</ul>;
}

function Linha({
  hora,
  emoji,
  titulo,
  detalhe,
  cor,
  agora,
  altura = 52,
  compacta = false,
  onClick,
}: {
  hora: number;
  emoji: string;
  titulo: string;
  detalhe: string;
  cor: string;
  agora: boolean;
  altura?: number;
  compacta?: boolean;
  onClick: () => void;
}) {
  return (
    <li className="flex items-stretch gap-2.5">
      <span className="w-11 shrink-0 pt-2.5 text-right text-xs font-semibold tabular-nums text-dim">
        {fmtHora(hora)}
      </span>
      <button
        onClick={onClick}
        className={`flex min-w-0 flex-1 cursor-pointer touch-manipulation items-center gap-2.5 rounded-xl border px-3 text-left transition-colors hover:bg-navy-700/40 ${
          compacta ? "py-2" : "py-2.5"
        }`}
        style={{
          minHeight: compacta ? 44 : altura,
          borderColor: agora ? cor : "var(--color-line)",
          background: agora ? `${cor}1f` : `${cor}0d`,
          boxShadow: `inset 3px 0 0 ${cor}`,
        }}
      >
        <span className="text-xl leading-none">{emoji}</span>
        <span className="min-w-0 flex-1">
          <span className="flex items-center gap-2">
            <span className="truncate text-sm font-semibold text-txt">{titulo}</span>
            {agora && (
              <span
                className="shrink-0 rounded-full px-1.5 py-0.5 text-[9px] font-bold uppercase tracking-wide text-navy-950"
                style={{ background: cor }}
              >
                agora
              </span>
            )}
          </span>
          <span className="block truncate text-[11px] tabular-nums text-mut">{detalhe}</span>
        </span>
      </button>
    </li>
  );
}

function Livre({ de, ate, onClick }: { de: number; ate: number; onClick: () => void }) {
  return (
    <li className="flex items-center gap-2.5">
      <span className="w-11 shrink-0" />
      <button
        onClick={onClick}
        className="flex min-h-8 flex-1 cursor-pointer touch-manipulation items-center gap-1.5 rounded-lg px-3 text-[11px] text-mut transition-colors hover:bg-navy-700/40 hover:text-dim"
        title="Criar um bloco neste horário"
      >
        <span className="h-px flex-1 border-t border-dashed border-line/60" />
        livre · {fmtMinutos(ate - de)}
        <Plus className="size-3" />
        <span className="h-px flex-1 border-t border-dashed border-line/60" />
      </button>
    </li>
  );
}
