import { Check, X } from "lucide-react";
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
    return (
      <div className="mt-3 space-y-2">
        {alternativasDe(q).map((a) => (
          <button
            key={a.letra}
            onClick={() => onResponder(a.letra)}
            className="flex w-full cursor-pointer items-start gap-2.5 rounded-lg border border-line/60 bg-navy-900/40 px-3 py-2.5 text-left transition-all hover:border-gold/50 hover:bg-navy-700/50 active:scale-[0.99]"
          >
            <span className="mt-px flex size-5 shrink-0 items-center justify-center rounded-md border border-line/70 text-[11px] font-bold text-dim">
              {a.letra}
            </span>
            <span className="text-sm leading-relaxed text-txt">{a.texto}</span>
          </button>
        ))}
      </div>
    );
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
