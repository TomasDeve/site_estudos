import type { ReactNode } from "react";
import { Star } from "lucide-react";
import type { TopicoQuestao } from "@/types/db";
import { acertou, estaResolvida } from "@/features/conteudos/questaoModelo";
import { corDesempenho } from "@/features/conteudos/desempenho";

/** `id` do card da questão na página, para a grade rolar até ele. */
export const ancoraQuestao = (id: string) => `q-${id}`;

/** Uma matéria da bateria, na ordem da prova, com as suas questões. */
export interface GrupoBateria {
  id: string;
  nome: string;
  icone: string;
  ids: string[];
}

/** "Contabilidade, Análise Financeira e Ordem Tributária" → "Contabilidade". */
const nomeCurto = (nome: string) => nome.split(",")[0].trim();

/**
 * Grade de números no topo da bateria (igual à da revisão semanal): verde acertou,
 * vermelho errou, cinza falta. Como na folha da prova, o número CIRCULADO é dúvida
 * e o número no QUADRADO é chute (`marca_prova`); a estrela é "criar card Anki".
 * Tocar no número abre só aquela questão; "Placar" volta para o placar e todas.
 *
 * Com mais de uma matéria (simulado), a grade se divide por matéria: o nome, de que
 * número a que número ela vai, o placar e uma barrinha verde/vermelha, para ver de
 * relance onde se perdeu ponto.
 */
export function GradeBateria({
  lista,
  numeroDe,
  atual,
  onSelecionar,
  grupos,
}: {
  lista: TopicoQuestao[];
  numeroDe: Map<string, number>;
  /** Questão aberta (anel dourado); null = placar com todas. */
  atual: string | null;
  onSelecionar: (id: string | null) => void;
  /** Matérias na ordem da prova; com 2 ou mais, a grade se divide. */
  grupos?: GrupoBateria[];
}) {
  const temDuvida = lista.some((q) => q.marca_prova === "duvida");
  const temChute = lista.some((q) => q.marca_prova === "chute");
  const comEstrela = lista.filter((q) => q.card_anki).length;
  const divididos = !!grupos && grupos.length > 1;
  const porId = new Map(lista.map((q) => [q.id, q]));

  const numero = (q: TopicoQuestao) => {
    const n = numeroDe.get(q.id) ?? 0;
    const feita = estaResolvida(q);
    const certo = feita && acertou(q);
    const marca = q.marca_prova === "duvida" ? "dúvida" : q.marca_prova === "chute" ? "chute" : "";
    return (
      <button
        key={q.id}
        onClick={() => onSelecionar(q.id)}
        aria-current={q.id === atual}
        title={`Questão ${n}${feita ? (certo ? " · acertou" : " · errou") : ""}${marca ? ` · ${marca}` : ""}${
          q.card_anki ? " · card Anki" : ""
        }`}
        className="relative flex size-10 cursor-pointer items-center justify-center"
      >
        {q.marca_prova && (
          <span
            aria-hidden
            className={`absolute inset-0.5 border-2 border-txt/80 ${
              q.marca_prova === "duvida" ? "rounded-full" : "rounded-[4px]"
            }`}
          />
        )}
        <span
          className={`flex size-[30px] items-center justify-center rounded-full border text-[11px] font-bold tabular-nums transition-colors ${
            q.id === atual ? "ring-2 ring-gold/80 ring-offset-1 ring-offset-navy-950" : ""
          } ${
            !feita
              ? "border-line/60 bg-navy-800 text-dim hover:text-txt"
              : certo
                ? "border-green/40 bg-green/20 text-green"
                : "border-red/40 bg-red/20 text-red"
          }`}
        >
          {n}
        </span>
        {q.card_anki && (
          <Star
            className="absolute -right-0.5 -top-0.5 size-3.5 fill-gold text-gold drop-shadow-[0_0_2px_rgba(0,0,0,0.9)]"
            aria-label="card Anki"
          />
        )}
      </button>
    );
  };

  const botaoPlacar = (
    <button
      onClick={() => onSelecionar(null)}
      title="Placar e todas as questões"
      className={`flex h-[30px] cursor-pointer items-center rounded-full border border-line/60 px-3 text-[11px] font-semibold text-dim transition-colors hover:text-txt ${
        divididos ? "" : "my-[5px] ml-1"
      } ${atual === null ? "ring-2 ring-gold/80 ring-offset-1 ring-offset-navy-950" : ""}`}
    >
      Placar
    </button>
  );

  const temLegenda = temDuvida || temChute || comEstrela > 0;

  return (
    <div>
      {divididos ? (
        <div className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
          {grupos!.map((g) => (
            <GrupoGrade
              key={g.id}
              grupo={g}
              questoes={g.ids.map((id) => porId.get(id)).filter((q): q is TopicoQuestao => !!q)}
              numeroDe={numeroDe}
              numero={numero}
            />
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap gap-1">
          {lista.map(numero)}
          {botaoPlacar}
        </div>
      )}

      {(divididos || temLegenda) && (
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mut">
          {divididos && botaoPlacar}
          {temDuvida && (
            <span className="flex items-center gap-1">
              <span className="inline-block size-3 rounded-full border-2 border-txt/80" /> circulou (dúvida)
            </span>
          )}
          {temChute && (
            <span className="flex items-center gap-1">
              <span className="inline-block size-3 rounded-[3px] border-2 border-txt/80" /> quadrado (chute)
            </span>
          )}
          {comEstrela > 0 && (
            <span className="flex items-center gap-1 text-gold">
              <Star className="size-3 fill-gold" /> {comEstrela} para o Anki
            </span>
          )}
        </div>
      )}
    </div>
  );
}

/** Uma matéria na grade: nome, faixa de números, placar, barrinha e os números. */
function GrupoGrade({
  grupo,
  questoes,
  numeroDe,
  numero,
}: {
  grupo: GrupoBateria;
  questoes: TopicoQuestao[];
  numeroDe: Map<string, number>;
  numero: (q: TopicoQuestao) => ReactNode;
}) {
  const nums = questoes.map((q) => numeroDe.get(q.id) ?? 0);
  const ini = Math.min(...nums);
  const fim = Math.max(...nums);
  const total = questoes.length;
  const feitas = questoes.filter((q) => estaResolvida(q));
  const acertos = feitas.filter((q) => acertou(q)).length;
  const erros = feitas.length - acertos;
  const pct = feitas.length ? Math.round((acertos / feitas.length) * 100) : null;
  const cor = pct !== null ? corDesempenho(pct).texto : "text-mut";

  return (
    <div className="min-w-0">
      <div className="flex items-center gap-1.5 px-[5px] text-xs">
        <span className="shrink-0">{grupo.icone}</span>
        <span className="min-w-0 truncate font-semibold text-dim" title={grupo.nome}>
          {nomeCurto(grupo.nome)}
        </span>
        <span className="shrink-0 text-[11px] tabular-nums text-mut">
          {ini === fim ? ini : `${ini}–${fim}`}
        </span>
        {pct !== null && (
          <span
            className={`ml-auto shrink-0 font-semibold tabular-nums ${cor}`}
            title={`${acertos} ${acertos === 1 ? "acerto" : "acertos"} e ${erros} ${
              erros === 1 ? "erro" : "erros"
            } em ${feitas.length} ${feitas.length === 1 ? "corrigida" : "corrigidas"}`}
          >
            {acertos}/{total}
          </span>
        )}
      </div>
      {pct !== null && (
        <div className="mx-[5px] mt-1 flex h-1.5 overflow-hidden rounded-full bg-navy-800" aria-hidden>
          <span className="bg-green/70" style={{ width: `${(acertos / total) * 100}%` }} />
          <span className="bg-red/70" style={{ width: `${(erros / total) * 100}%` }} />
        </div>
      )}
      <div className="mt-1 flex flex-wrap gap-1">{questoes.map(numero)}</div>
    </div>
  );
}
