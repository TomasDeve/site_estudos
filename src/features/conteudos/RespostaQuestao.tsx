import { useState } from "react";
import { Check, Scissors, X } from "lucide-react";
import type { TopicoQuestao } from "@/types/db";
import { acertou, alternativasDe, ehMultipla } from "./questaoModelo";

/**
 * Botões para responder uma questão ainda não resolvida. O fluxo é em dois
 * passos, como no QConcursos: primeiro o aluno **seleciona** uma alternativa
 * (podendo trocar à vontade) e só ao clicar em "Responder" a resposta é
 * registrada — evita responder sem querer com um clique acidental. Certo/Errado
 * mostra os dois botões clássicos; múltipla escolha mostra uma linha por
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
  return <CertoErradoResposta onResponder={onResponder} />;
}

/** Botão de confirmação; só habilita depois que o aluno escolheu uma resposta. */
function BotaoResponder({ pronto, onClick }: { pronto: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!pronto}
      className="flex h-11 w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-gold text-sm font-semibold text-navy-950 shadow-[0_2px_12px_rgb(224_168_62/0.25)] transition-all hover:bg-gold-soft active:scale-[0.98] disabled:cursor-not-allowed disabled:bg-navy-700 disabled:text-dim/60 disabled:shadow-none"
    >
      Responder
    </button>
  );
}

/**
 * Certo/Errado em dois passos: clicar em um dos botões apenas o seleciona
 * (destacado), e a resposta só conta ao confirmar em "Responder". Dá para
 * trocar a seleção antes de confirmar.
 */
function CertoErradoResposta({
  onResponder,
}: {
  onResponder: (valor: boolean | string) => void;
}) {
  const [selecionado, setSelecionado] = useState<boolean | null>(null);

  return (
    <div className="mt-3 space-y-2">
      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => setSelecionado(true)}
          aria-pressed={selecionado === true}
          className={`flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold text-green transition-all active:scale-[0.97] ${
            selecionado === true
              ? "border-green bg-green/25 ring-2 ring-green/40"
              : "border-green/30 bg-green/10 hover:bg-green/20"
          }`}
        >
          <Check className="size-4" /> Certo
        </button>
        <button
          type="button"
          onClick={() => setSelecionado(false)}
          aria-pressed={selecionado === false}
          className={`flex h-11 flex-1 cursor-pointer items-center justify-center gap-1.5 rounded-lg border text-sm font-semibold text-red transition-all active:scale-[0.97] ${
            selecionado === false
              ? "border-red bg-red/25 ring-2 ring-red/40"
              : "border-red/30 bg-red/10 hover:bg-red/20"
          }`}
        >
          <X className="size-4" /> Errado
        </button>
      </div>
      <BotaoResponder
        pronto={selecionado !== null}
        onClick={() => selecionado !== null && onResponder(selecionado)}
      />
    </div>
  );
}

/**
 * Alternativas de múltipla escolha com "tesoura" ao lado, no estilo do
 * QConcursos: clicar na tesoura risca (elimina) a alternativa que o aluno já
 * descartou — um apoio para resolver por eliminação. Uma alternativa riscada
 * fica travada para marcação até ser restaurada. Responder é em dois passos:
 * clicar numa alternativa apenas a seleciona (dá para trocar) e só ao confirmar
 * em "Responder" a resposta é registrada. O estado é local: vale só enquanto a
 * questão não foi respondida.
 */
function AlternativasResposta({
  questao: q,
  onResponder,
}: {
  questao: TopicoQuestao;
  onResponder: (valor: boolean | string) => void;
}) {
  const [riscadas, setRiscadas] = useState<Set<string>>(() => new Set());
  const [selecionada, setSelecionada] = useState<string | null>(null);

  const alternarRisco = (letra: string) => {
    setRiscadas((prev) => {
      const proximo = new Set(prev);
      if (proximo.has(letra)) proximo.delete(letra);
      else proximo.add(letra);
      return proximo;
    });
    // Riscar a alternativa que estava selecionada limpa a seleção.
    setSelecionada((prev) => (prev === letra ? null : prev));
  };

  return (
    <div className="mt-3 space-y-2">
      {alternativasDe(q).map((a) => {
        const riscada = riscadas.has(a.letra);
        const marcada = selecionada === a.letra;
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
              onClick={() => setSelecionada(a.letra)}
              disabled={riscada}
              aria-disabled={riscada}
              aria-pressed={marcada}
              className={`flex flex-1 items-start gap-2.5 rounded-lg border px-3 py-2.5 text-left transition-all ${
                riscada
                  ? "cursor-default border-line/30 bg-transparent"
                  : marcada
                    ? "cursor-pointer border-gold bg-gold/15 ring-1 ring-gold/40"
                    : "cursor-pointer border-line/60 bg-navy-900/40 hover:border-gold/50 hover:bg-navy-700/50 active:scale-[0.99]"
              }`}
            >
              <span
                className={`mt-px flex size-5 shrink-0 items-center justify-center rounded-md border text-[11px] font-bold ${
                  riscada
                    ? "border-line/40 text-dim/50"
                    : marcada
                      ? "border-gold bg-gold/20 text-gold"
                      : "border-line/70 text-dim"
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
      <BotaoResponder
        pronto={selecionada !== null}
        onClick={() => selecionada !== null && onResponder(selecionada)}
      />
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
