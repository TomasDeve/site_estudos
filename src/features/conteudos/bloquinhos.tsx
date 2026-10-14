import { useEffect, useRef, useState, type ReactNode } from "react";
import { Check, ChevronLeft, ChevronRight, Layers } from "lucide-react";
import type { QuestaoLog, TopicoQuestao } from "@/types/db";
import { Button } from "@/components/Button";
import { corDesempenho } from "./desempenho";
import { DesempenhoRecenteChip } from "./DesempenhoRecenteChip";
import { acertou, estaResolvida } from "./questaoModelo";
import {
  blocosRestantes,
  montarProximoBloco,
  TAMANHO_BLOCO as TAMANHO,
  type BlocoMontado,
  type RegrasDoBloco,
} from "./blocosPorMateria";

const CHAVE = "questoes_bloquinhos";

/** O mínimo que o bloquinho lê de cada questão (basta o índice leve, sem o enunciado). */
export type QuestaoDoBloco = Pick<
  TopicoQuestao,
  "id" | "tipo" | "resposta" | "resposta_letra" | "gabarito" | "gabarito_letra"
>;

export interface Bloquinho<T extends QuestaoDoBloco = QuestaoDoBloco> {
  /** O que renderizar: o bloco da vez ou, com o modo desligado, a lista inteira. */
  lista: T[];
  ativo: boolean;
  alternar: () => void;
  indice: number;
  total: number;
  respondidas: number;
  acertos: number;
  pct: number | null;
  completo: boolean;
  ir: (indice: number) => void;
  /** As do bloco seguinte — para já buscar o conteúdo delas. */
  proximos: T[];
  /** Só nos bloquinhos por matéria: a matéria do bloco da vez e a do seguinte. */
  grupo?: string;
  proximoGrupo?: string;
}

/** A preferência do modo fica lembrada entre visitas (vale para os dois tipos de bloquinho). */
function usePreferencia() {
  const [ativo, setAtivo] = useState(() => localStorage.getItem(CHAVE) === "1");
  function alternar() {
    localStorage.setItem(CHAVE, ativo ? "0" : "1");
    setAtivo(!ativo);
  }
  return [ativo, alternar] as const;
}

/** Placar do bloco da vez (só do momento — nada é gravado por bloco). */
function placarDo<T extends QuestaoDoBloco>(doBloco: T[]) {
  const respondidas = doBloco.filter((q) => estaResolvida(q));
  const acertos = respondidas.filter((q) => acertou(q)).length;
  return {
    respondidas: respondidas.length,
    acertos,
    pct: respondidas.length ? Math.round((acertos / respondidas.length) * 100) : null,
    completo: doBloco.length > 0 && respondidas.length === doBloco.length,
  };
}

/**
 * Fatia a lista em bloquinhos de 5 e guarda em qual deles você está.
 *
 * O placar do bloco é só do momento: nada é gravado por bloco — as respostas
 * seguem indo para o banco como em qualquer outra questão, e o placar do
 * caderno continua sendo o do assunto inteiro.
 *
 * `reset` é a chave que devolve ao primeiro bloco (trocar de aba, embaralhar…).
 */
export function useBloquinhos<T extends QuestaoDoBloco>(lista: T[], reset: string): Bloquinho<T> {
  // O bloco em que você parou não fica lembrado — ao voltar, "Para responder" já
  // começa nas próximas 5 em aberto.
  const [ativo, alternar] = usePreferencia();
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    setIndice(0);
  }, [reset, ativo]);

  const total = Math.ceil(lista.length / TAMANHO);
  // Questão que sai da aba no meio do caminho (arquivar, marcar difícil) pode
  // encurtar a lista: o bloco atual acompanha em vez de ficar numa página vazia.
  const atual = Math.min(indice, Math.max(total - 1, 0));
  const doBloco = ativo ? lista.slice(atual * TAMANHO, atual * TAMANHO + TAMANHO) : lista;

  return {
    lista: doBloco,
    ativo,
    alternar,
    indice: atual,
    total,
    ...placarDo(doBloco),
    ir(i) {
      setIndice(Math.min(Math.max(i, 0), Math.max(total - 1, 0)));
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    proximos: ativo ? lista.slice((atual + 1) * TAMANHO, (atual + 2) * TAMANHO) : [],
  };
}

/**
 * Bloquinhos por matéria (modo misturado): cada bloco de 5 é de uma matéria só e as
 * matérias da lista se revezam; a questão pulada volta num próximo bloco da matéria
 * dela (regras em `blocosPorMateria`). O bloco é montado e congelado ao chegar nele —
 * responder não remexe o que está na tela — e o seguinte só na hora de avançar, pois
 * depende do que ficou sem resposta.
 *
 * `reset` é a chave que recomeça do primeiro bloco (filtro, aba, embaralhar…).
 */
export function useBloquinhosPorMateria<T extends QuestaoDoBloco>(
  lista: T[],
  reset: string,
  regras: Omit<RegrasDoBloco<T>, "resolvida">
): Bloquinho<T> {
  const [ativo, alternar] = usePreferencia();
  const chave = `${reset}|${ativo}`;
  const r: RegrasDoBloco<T> = { ...regras, resolvida: estaResolvida };
  const [salvo, setSalvo] = useState<{ chave: string; blocos: BlocoMontado[]; indice: number }>({
    chave,
    blocos: [],
    indice: 0,
  });

  // Ajuste durante o render (sem efeito, para não pintar o bloco errado): mudou a
  // chave → recomeça; chegou a um bloco ainda não montado → monta e congela.
  let st = salvo.chave === chave ? salvo : { chave, blocos: [], indice: 0 };
  if (ativo && st.indice >= st.blocos.length) {
    const novo = montarProximoBloco(lista, st.blocos, r);
    if (novo) st = { ...st, blocos: [...st.blocos, novo] };
  }
  if (st !== salvo) setSalvo(st);

  if (!ativo) {
    return {
      lista,
      ativo,
      alternar,
      indice: 0,
      total: 0,
      ...placarDo(lista),
      ir() {},
      proximos: [],
    };
  }

  const porId = new Map(lista.map((q) => [q.id, q]));
  // Arquivada no meio do caminho sai da lista — e do bloco.
  const itens = (b: BlocoMontado | null | undefined) =>
    (b?.ids ?? []).flatMap((id) => porId.get(id) ?? []);

  const { blocos } = st;
  const total = blocos.length + blocosRestantes(lista, blocos, r);
  const atual = Math.min(st.indice, Math.max(blocos.length - 1, 0));
  const seguinte =
    atual < blocos.length - 1
      ? blocos[atual + 1]
      : atual + 1 < total
        ? montarProximoBloco(lista, blocos, r)
        : null;
  const doBloco = itens(blocos[atual]);

  return {
    lista: doBloco,
    ativo,
    alternar,
    indice: atual,
    total,
    ...placarDo(doBloco),
    ir(i) {
      setSalvo({ ...st, indice: Math.min(Math.max(i, 0), Math.max(total - 1, 0)) });
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
    proximos: itens(seguinte),
    grupo: blocos[atual]?.grupo,
    proximoGrupo: seguinte?.grupo,
  };
}

/** Liga/desliga o modo — fica junto do placar do caderno. */
export function BotaoBloquinhos({ b, className = "" }: { b: Bloquinho; className?: string }) {
  return (
    <button
      onClick={b.alternar}
      title={
        b.ativo
          ? "Voltar a mostrar todas as questões de uma vez"
          : "Resolver em blocos de 5 questões, com placar do bloco"
      }
      className={`flex shrink-0 cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
        b.ativo
          ? "border-gold/40 bg-gold/10 text-gold"
          : "border-line/60 text-dim hover:border-line hover:bg-navy-700/60 hover:text-txt"
      } ${className}`}
    >
      <Layers className="size-3.5" />
      Resolver em bloquinhos
    </button>
  );
}

/**
 * Placar do bloco da vez: uma bolinha por questão, verde/vermelha conforme a resposta.
 * `rotulo` (ex.: a matéria do bloco) aparece junto do número.
 */
export function CabecalhoBloco({ b, rotulo }: { b: Bloquinho; rotulo?: ReactNode }) {
  if (!b.ativo || b.total === 0) return null;
  const cor = b.pct !== null ? corDesempenho(b.pct) : null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-gold/25 bg-gold/[0.06] px-3 py-2.5">
      <span className="text-xs font-semibold text-gold">
        Bloco {b.indice + 1} <span className="font-normal text-dim">de {b.total}</span>
      </span>

      {rotulo && <span className="min-w-0 truncate text-xs font-medium text-txt">{rotulo}</span>}

      <span className="flex items-center gap-1">
        {b.lista.map((q) => (
          <span
            key={q.id}
            className={`size-2 rounded-full ${
              !estaResolvida(q) ? "bg-navy-600" : acertou(q) ? "bg-green" : "bg-red"
            }`}
          />
        ))}
      </span>

      <span className="text-xs tabular-nums text-dim">
        {b.respondidas}/{b.lista.length}
      </span>

      {b.pct !== null && cor && (
        <span className={`ml-auto text-xs font-semibold tabular-nums ${cor.texto}`}>
          {b.acertos} {b.acertos === 1 ? "acerto" : "acertos"} · {b.pct}% no bloco
        </span>
      )}
    </div>
  );
}

/**
 * Navegação entre blocos. Enquanto o bloco não fecha, um rodapé enxuto (dá para
 * pular uma questão travada); assim que as 5 são respondidas, vira o painel de
 * bloco concluído, com o desempenho e o salto rápido para o próximo.
 */
export function RodapeBloco({
  b,
  logs,
  proximo,
}: {
  b: Bloquinho;
  logs?: QuestaoLog[];
  /** O que vem no bloco seguinte (ex.: a matéria dele). */
  proximo?: ReactNode;
}) {
  if (!b.ativo || b.total === 0) return null;
  if (b.completo) return <BlocoConcluido b={b} logs={logs} proximo={proximo} />;

  const ultimo = b.indice >= b.total - 1;
  const faltam = b.lista.length - b.respondidas;

  return (
    <div className="flex flex-wrap items-center justify-between gap-2 border-t border-line/30 pt-3">
      <Button
        size="sm"
        variant="ghost"
        disabled={b.indice === 0}
        onClick={() => b.ir(b.indice - 1)}
      >
        <ChevronLeft className="size-4" />
        Bloco anterior
      </Button>

      {ultimo ? (
        <span className="text-xs text-mut">Último bloco · faltam {faltam}</span>
      ) : (
        // Segue clicável antes de completar: pular uma questão travada é melhor
        // do que ficar preso no bloco.
        <Button
          size="sm"
          variant="secondary"
          onClick={() => b.ir(b.indice + 1)}
          title={
            b.grupo !== undefined
              ? "As que ficarem sem resposta voltam num próximo bloco desta matéria"
              : undefined
          }
        >
          Pular para o próximo (faltam {faltam})
          <ChevronRight className="size-4" />
        </Button>
      )}
    </div>
  );
}

/**
 * Fim de um bloco de 5: um respiro com o placar do bloco e o desempenho recente,
 * já com o "Próximo bloco" em foco — dá para emendar o próximo só apertando
 * Enter, sem tirar a mão do teclado nem procurar o botão.
 */
function BlocoConcluido({
  b,
  logs,
  proximo,
}: {
  b: Bloquinho;
  logs?: QuestaoLog[];
  proximo?: ReactNode;
}) {
  const ultimo = b.indice >= b.total - 1;
  const cor = b.pct !== null ? corDesempenho(b.pct) : null;
  const painelRef = useRef<HTMLDivElement>(null);

  // Foca o "Próximo bloco" sem puxar a rolagem, para não atrapalhar quem ainda
  // está lendo o comentário da última questão — o Enter emenda quando quiser.
  useEffect(() => {
    painelRef.current
      ?.querySelector<HTMLButtonElement>(".js-proximo-bloco")
      ?.focus({ preventScroll: true });
  }, [b.indice]);

  return (
    <div
      ref={painelRef}
      className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-gold/30 bg-gold/[0.08] px-3 py-3"
    >
      <span className="flex items-center gap-1.5 text-sm font-semibold text-gold">
        <Check className="size-4" />
        {ultimo ? "Último bloco concluído" : `Bloco ${b.indice + 1} concluído`}
      </span>

      {b.pct !== null && cor && (
        <span className={`text-xs font-semibold tabular-nums ${cor.texto}`}>
          {b.acertos}/{b.lista.length} · {b.pct}% no bloco
        </span>
      )}

      {logs && <DesempenhoRecenteChip logs={logs} />}

      <div className="ml-auto flex min-w-0 items-center gap-2">
        {!ultimo && proximo && (
          <span className="min-w-0 truncate text-[11px] text-mut">A seguir: {proximo}</span>
        )}
        <Button
          size="sm"
          variant="ghost"
          disabled={b.indice === 0}
          onClick={() => b.ir(b.indice - 1)}
        >
          <ChevronLeft className="size-4" />
          <span className="max-sm:hidden">Anterior</span>
        </Button>
        {ultimo ? (
          <span className="text-xs font-semibold text-green">Tudo resolvido 🎉</span>
        ) : (
          <Button
            size="sm"
            variant="primary"
            className="js-proximo-bloco"
            onClick={() => b.ir(b.indice + 1)}
          >
            Próximo bloco
            <ChevronRight className="size-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
