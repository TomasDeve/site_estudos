import { useState } from "react";
import { Check, Scissors, X } from "lucide-react";
import type { TopicoQuestao } from "@/types/db";
import { acertou, alternativasDe, ehMultipla } from "./questaoModelo";

/**
 * Botões para responder uma questão ainda não resolvida. Certo/Errado mostra os
 * dois botões clássicos; múltipla escolha mostra uma linha clicável por
 * alternativa (A..E). `onResponder` recebe boolean (C/E) ou a letra (múltipla).
 */
export function BotoesResposta({
  questao: q,
  onResponder,
}: {
  questao: TopicoQuestao;
  onResponder: (valor: boolean | string) => void;
}) {
  if (ehMultipla(q)) {
    return <AlternativasResposta questao={q} onResponder={onResponder} />;
  }
  return (
    <div className="mt-3 flex gap-2">
      <button
        onClick={() => onResponder(true)}
        className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-green/30 bg-green/15 text-sm font-semibold text-green transition-all hover:bg-green/25 active:scale-[0.97]"
      >
        <Check className="size-4" /> Certo
      </button>
      <button
        onClick={() => onResponder(false)}
        className="flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border border-red/30 bg-red/15 text-sm font-semibold text-red transition-all hover:bg-red/25 active:scale-[0.97]"
      >
        <X className="size-4" /> Errado
      </button>
    </div>
  );
}

/**
 * Alternativas de múltipla escolha com "tesoura" ao lado, no estilo do
 * QConcursos: clicar na tesoura risca (elimina) a alternativa que o aluno já
 * descartou — um apoio para resolver por eliminação. Uma alternativa riscada
 * fica travada para marcação até ser restaurada. O estado é local: vale só
 * enquanto a questão não foi respondida.
 */
function AlternativasResposta({
  questao: q,
  onResponder,
}: {
  questao: TopicoQuestao;
  onResponder: (valor: boolean | string) => void;
}) {
  const [riscadas, setRiscadas] = useState<Set<string>>(() => new Set());

  const alternarRisco = (letra: string) =>
    setRiscadas((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(letra)) proximo.delete(letra);
      else proximo.add(letra);
      return proximo;
    });

  return (
    <div className="mt-3 space-y-2">
      {alternativasDe(q).map((a) => {
        const riscada = riscadas.has(a.letra);
        return (
          <div key={a.letra} className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => alternarRisco(a.letra)}
              aria-pressed={riscada}
              title={riscada ? "Restaurar alternativa" : "Riscar (eliminar) alternativa"}
              className={`flex size-8 shrink-0 cursor-pointer items-center justify-center rounded-md transition-colors ${
                riscada
                  ? "text-red hover:text-red/80"
                  : "text-dim/45 hover:bg-navy-700/50 hover:text-gold"
              }`}
            >
              <Scissors className="size-4" />
            </button>
            <button
              type="button"
              onClick={() => onResponder(a.letra)}
              disabled={riscada}
              aria-disabled={riscada}
              className={`flex flex-1 items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
                riscada
                  ? "cursor-default border-line/30 bg-transparent"
                  : "cursor-pointer border-line/60 bg-navy-900/40 hover:border-gold/50 hover:bg-navy-700/50 active:scale-[0.99]"
              }`}
            >
              <span
                className={`mt-px flex size-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold ${
                  riscada ? "border-line/40 text-dim/50" : "border-line/70 text-dim"
                }`}
              >
                {a.letra}
              </span>
              <span
                className={`text-sm leading-relaxed ${
                  riscada
                    ? "text-dim/50 line-through decoration-red/60 decoration-2"
                    : "text-txt"
                }`}
              >
                {a.texto}
              </span>
            </button>
          </div>
        );
      })}
    </div>
  );
}

/**
 * Faixa de resultado após responder. Em C/E mostra a resposta dada vs. o
 * gabarito; em múltipla escolha lista as alternativas destacando a correta
 * (verde) e, se o aluno errou, a que ele marcou (vermelho).
 */
export function ResultadoResposta({ questao: q }: { questao: TopicoQuestao }) {
  const certo = acertou(q);
  return (
    <>
      <div
        className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-2.5 py-2 text-xs font-semibold ${
          certo ? "bg-green/10 text-green" : "bg-red/10 text-red"
        }`}
      >
        {certo ? <Check className="size-4" /> : <X className="size-4" />}
        {certo ? "Você acertou" : "Você errou"}
        {!ehMultipla(q) && (
          <span className="font-normal text-dim">
            Sua resposta: {q.resposta ? "Certo" : "Errado"} · Gabarito:{" "}
            <strong className="text-txt">{q.gabarito ? "CERTO" : "ERRADO"}</strong>
          </span>
        )}
      </div>

      {ehMultipla(q) && (
        <ul className="space-y-1.5">
          {alternativasDe(q).map((a) => {
            const correta = a.letra === q.gabarito_letra;
            const marcadaErrada = a.letra === q.resposta_letra && !correta;
            return (
              <li
                key={a.letra}
                className={`flex items-start gap-2.5 rounded-lg border px-3 py-2 text-sm ${
                  correta
                    ? "border-green/40 bg-green/10 text-green"
                    : marcadaErrada
                      ? "border-red/40 bg-red/10 text-red"
                      : "border-line/40 text-dim"
                }`}
              >
                <span
                  className={`mt-px flex size-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold ${
                    correta ? "border-green/50" : marcadaErrada ? "border-red/50" : "border-line/60"
                  }`}
                >
                  {a.letra}
                </span>
                <span className="leading-relaxed">{a.texto}</span>
                {correta && <Check className="ml-auto size-4 shrink-0" />}
                {marcadaErrada && <X className="ml-auto size-4 shrink-0" />}
              </li>
            );
          })}
        </ul>
      )}
    </>
  );
}
