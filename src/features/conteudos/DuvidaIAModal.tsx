import { Sparkles } from "lucide-react";
import type { TopicoQuestao } from "@/types/db";
import { ChatIA } from "./ChatIA";
import { ehMultipla, gabaritoLabel } from "./questaoModelo";

interface Props {
  questao: TopicoQuestao;
  materiaNome?: string;
  assunto?: string;
  onClose: () => void;
}

/**
 * Chat com a IA sobre UMA questão. A Edge Function `tirar-duvida` já recebe o
 * item, gabarito, comentário e a resposta do aluno — a primeira pergunta pode
 * ser um clique numa sugestão. O histórico fica guardado por questão até
 * fechar/recarregar a aba do navegador.
 */
export function DuvidaIAModal({ questao, materiaNome, assunto, onClose }: Props) {
  const sugestoes = [
    "Me explique isso de forma simples",
    "Aponte em que parte isto está escrito",
    "Como isso pode cair?",
  ];

  return (
    <ChatIA
      titulo={
        <span className="flex items-center gap-2">
          <Sparkles className="size-4 shrink-0 text-gold" /> Tirar dúvida com IA
        </span>
      }
      chave={`questao-${questao.id}`}
      montarPayload={() => ({
        materia: materiaNome ?? null,
        assunto: assunto ?? null,
        questao: {
          tipo: questao.tipo,
          contexto: questao.contexto,
          enunciado: questao.enunciado,
          gabarito: questao.gabarito,
          gabarito_letra: questao.gabarito_letra,
          alternativas: questao.alternativas,
          comentario: questao.comentario,
          resposta: questao.resposta,
          resposta_letra: questao.resposta_letra,
        },
      })}
      sugestoes={sugestoes}
      recap={
        <div className="rounded-lg border border-line/40 bg-navy-900/60 px-3 py-2.5">
          <div className="mb-1.5 flex flex-wrap items-center gap-1.5">
            {materiaNome && (
              <span className="rounded-full bg-navy-700 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-dim">
                {materiaNome}
              </span>
            )}
            <span
              className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${
                ehMultipla(questao)
                  ? "bg-gold/15 text-gold"
                  : questao.gabarito
                    ? "bg-green/15 text-green"
                    : "bg-red/15 text-red"
              }`}
            >
              Gabarito: {gabaritoLabel(questao)}
            </span>
          </div>
          <p className="line-clamp-3 text-xs leading-relaxed text-dim">{questao.enunciado}</p>
        </div>
      }
      onClose={onClose}
    />
  );
}
