import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, Layers } from "lucide-react";
import type { TopicoQuestao } from "@/types/db";
import { Button } from "@/components/Button";
import { corDesempenho } from "./desempenho";

/** Série curta: 5 questões por vez, para a resolução ter começo, meio e fim. */
const TAMANHO = 5;
const CHAVE = "questoes_bloquinhos";

export interface Bloquinho {
  /** O que renderizar: o bloco da vez ou, com o modo desligado, a lista inteira. */
  lista: TopicoQuestao[];
  ativo: boolean;
  alternar: () => void;
  indice: number;
  total: number;
  respondidas: number;
  acertos: number;
  pct: number | null;
  completo: boolean;
  ir: (indice: number) => void;
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
export function useBloquinhos(lista: TopicoQuestao[], reset: string): Bloquinho {
  // A preferência fica lembrada entre visitas; o bloco em que você parou, não —
  // ao voltar, "Para responder" já começa nas próximas 5 em aberto.
  const [ativo, setAtivo] = useState(() => localStorage.getItem(CHAVE) === "1");
  const [indice, setIndice] = useState(0);

  useEffect(() => {
    setIndice(0);
  }, [reset, ativo]);

  const total = Math.ceil(lista.length / TAMANHO);
  // Questão que sai da aba no meio do caminho (arquivar, marcar reforço) pode
  // encurtar a lista: o bloco atual acompanha em vez de ficar numa página vazia.
  const atual = Math.min(indice, Math.max(total - 1, 0));
  const doBloco = ativo ? lista.slice(atual * TAMANHO, atual * TAMANHO + TAMANHO) : lista;

  const respondidas = doBloco.filter((q) => q.resposta !== null);
  const acertos = respondidas.filter((q) => q.resposta === q.gabarito).length;

  return {
    lista: doBloco,
    ativo,
    alternar() {
      localStorage.setItem(CHAVE, ativo ? "0" : "1");
      setAtivo(!ativo);
    },
    indice: atual,
    total,
    respondidas: respondidas.length,
    acertos,
    pct: respondidas.length ? Math.round((acertos / respondidas.length) * 100) : null,
    completo: doBloco.length > 0 && respondidas.length === doBloco.length,
    ir(i) {
      setIndice(Math.min(Math.max(i, 0), Math.max(total - 1, 0)));
      window.scrollTo({ top: 0, behavior: "smooth" });
    },
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

/** Placar do bloco da vez: uma bolinha por questão, verde/vermelha conforme a resposta. */
export function CabecalhoBloco({ b }: { b: Bloquinho }) {
  if (!b.ativo || b.total === 0) return null;
  const cor = b.pct !== null ? corDesempenho(b.pct) : null;

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-gold/25 bg-gold/[0.06] px-3 py-2.5">
      <span className="text-xs font-semibold text-gold">
        Bloco {b.indice + 1} <span className="font-normal text-dim">de {b.total}</span>
      </span>

      <span className="flex items-center gap-1">
        {b.lista.map((q) => (
          <span
            key={q.id}
            className={`size-2 rounded-full ${
              q.resposta === null ? "bg-navy-600" : q.resposta === q.gabarito ? "bg-green" : "bg-red"
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

/** Navegação entre blocos — "Próximo bloco" acende quando as 5 estão respondidas. */
export function RodapeBloco({ b }: { b: Bloquinho }) {
  if (!b.ativo || b.total === 0) return null;
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
        <span className="text-xs text-mut">
          {b.completo ? "Último bloco concluído 🎉" : `Último bloco · faltam ${faltam}`}
        </span>
      ) : (
        // Segue clicável antes de completar: pular uma questão travada é melhor
        // do que ficar preso no bloco.
        <Button
          size="sm"
          variant={b.completo ? "primary" : "secondary"}
          onClick={() => b.ir(b.indice + 1)}
        >
          {b.completo ? "Próximo bloco" : `Pular para o próximo (faltam ${faltam})`}
          <ChevronRight className="size-4" />
        </Button>
      )}
    </div>
  );
}
