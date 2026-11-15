import { Star } from "lucide-react";
import type { TopicoQuestao } from "@/types/db";
import { acertou, estaResolvida } from "@/features/conteudos/questaoModelo";

/** `id` do card da questão na página, para a grade rolar até ele. */
export const ancoraQuestao = (id: string) => `q-${id}`;

/**
 * Grade de números no topo da bateria (igual à da revisão semanal): verde acertou,
 * vermelho errou, cinza falta. Como na folha da prova, o número CIRCULADO é dúvida
 * e o número no QUADRADO é chute (`marca_prova`); a estrela é "criar card Anki".
 * Tocar no número abre só aquela questão; "Placar" volta para o placar e todas.
 */
export function GradeBateria({
  lista,
  numeroDe,
  atual,
  onSelecionar,
}: {
  lista: TopicoQuestao[];
  numeroDe: Map<string, number>;
  /** Questão aberta (anel dourado); null = placar com todas. */
  atual: string | null;
  onSelecionar: (id: string | null) => void;
}) {
  const temDuvida = lista.some((q) => q.marca_prova === "duvida");
  const temChute = lista.some((q) => q.marca_prova === "chute");
  const comEstrela = lista.filter((q) => q.card_anki).length;

  return (
    <div>
      <div className="flex flex-wrap gap-1">
        {lista.map((q) => {
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
        })}
        <button
          onClick={() => onSelecionar(null)}
          title="Placar e todas as questões"
          className={`my-[5px] ml-1 flex h-[30px] cursor-pointer items-center rounded-full border border-line/60 px-3 text-[11px] font-semibold text-dim transition-colors hover:text-txt ${
            atual === null ? "ring-2 ring-gold/80 ring-offset-1 ring-offset-navy-950" : ""
          }`}
        >
          Placar
        </button>
      </div>

      {(temDuvida || temChute || comEstrela > 0) && (
        <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-mut">
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
        </p>
      )}
    </div>
  );
}
