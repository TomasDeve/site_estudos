import { RotateCcw, Star } from "lucide-react";
import type { Json, QuestaoCategoria } from "@/types/db";
import { chaveFiltro, type FiltroQuestoes } from "./filtroQuestoes";
import type { FormatoQuestao } from "./QuestoesPage";

/**
 * Filtro padrão da página de questões (concursos.questoes_filtro_padrao): tudo o
 * que dá para recortar — matérias/assuntos, formato, bancas e origens. A página
 * já abre com ele (ex.: sem RLM e Estatística, pra treinar questões rápidas).
 */
export interface FiltroPadrao {
  filtro: FiltroQuestoes;
  formato: FormatoQuestao;
  bancas: string[];
  cats: QuestaoCategoria[];
}

const FORMATOS: readonly FormatoQuestao[] = ["todos", "ce", "multipla"];
const strings = (v: unknown): string[] =>
  Array.isArray(v) ? v.filter((x): x is string => typeof x === "string") : [];

/** Lê o JSON do banco com tolerância (campo faltando = sem recorte nele). */
export function lerFiltroPadrao(json: Json | null | undefined): FiltroPadrao | null {
  if (!json || typeof json !== "object" || Array.isArray(json)) return null;
  const o = json as Record<string, unknown>;
  const filtro: FiltroQuestoes = Array.isArray(o.filtro)
    ? o.filtro.flatMap((i) => {
        if (!i || typeof i !== "object") return [];
        const r = i as Record<string, unknown>;
        return typeof r.materiaId === "string"
          ? [{ materiaId: r.materiaId, assuntos: strings(r.assuntos) }]
          : [];
      })
    : [];
  const formato = FORMATOS.includes(o.formato as FormatoQuestao)
    ? (o.formato as FormatoQuestao)
    : "todos";
  return {
    filtro,
    formato,
    bancas: strings(o.bancas),
    cats: strings(o.cats) as QuestaoCategoria[],
  };
}

/** Chave estável (independe da ordem) — para saber se o que está na tela é o padrão. */
export function chaveFiltroPadrao(p: FiltroPadrao): string {
  return [chaveFiltro(p.filtro), p.formato, [...p.bancas].sort().join(","), [...p.cats].sort().join(",")].join("#");
}

export const ehVazio = (p: FiltroPadrao) =>
  p.filtro.length === 0 && p.formato === "todos" && p.bancas.length === 0 && p.cats.length === 0;

/**
 * Linha do filtro padrão, abaixo das pílulas: salvar o filtro da tela como padrão,
 * voltar a ele depois de mexer, ou deixar de abrir com ele.
 */
export function BarraFiltroPadrao({
  atual,
  padrao,
  salvando,
  onSalvar,
  onVoltar,
  onRemover,
}: {
  atual: FiltroPadrao;
  padrao: FiltroPadrao | null;
  salvando: boolean;
  onSalvar: () => void;
  onVoltar: () => void;
  onRemover: () => void;
}) {
  const igual = padrao !== null && chaveFiltroPadrao(padrao) === chaveFiltroPadrao(atual);
  // Sem padrão e sem nada filtrado, não há o que salvar.
  if (!padrao && ehVazio(atual)) return null;

  const link =
    "flex min-h-8 cursor-pointer touch-manipulation items-center gap-1 rounded-lg px-2 text-[11px] font-semibold transition-colors disabled:cursor-default disabled:opacity-50";

  return (
    <div className="flex flex-wrap items-center gap-x-1 gap-y-1">
      {igual ? (
        <>
          <span className="flex items-center gap-1 px-1 text-[11px] font-semibold text-gold">
            <Star className="size-3.5 fill-current" />
            Filtro padrão — a página já abre assim
          </span>
          <button onClick={onRemover} disabled={salvando} className={`${link} text-mut hover:text-txt`}>
            Não abrir mais com ele
          </button>
        </>
      ) : (
        <>
          <button
            onClick={onSalvar}
            disabled={salvando}
            className={`${link} border border-gold/40 text-gold hover:bg-gold/10`}
          >
            <Star className="size-3.5" />
            {padrao ? "Salvar este como padrão" : "Salvar este filtro como padrão"}
          </button>
          {padrao && (
            <button onClick={onVoltar} className={`${link} text-dim hover:text-txt`}>
              <RotateCcw className="size-3.5" />
              Voltar ao padrão
            </button>
          )}
        </>
      )}
    </div>
  );
}
