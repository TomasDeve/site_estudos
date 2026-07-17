import { Sparkles } from "lucide-react";
import type { TopicoQuestao } from "@/types/db";
import { ChatIA } from "./ChatIA";

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
  const errou = questao.resposta !== null && questao.resposta !== questao.gabarito;

  const sugestoes = [
    ...(errou ? ["Onde meu raciocínio falhou?"] : []),
    "Por que o gabarito é esse?",
    "Me dá um macete para não errar mais",
    "Como a banca costuma cobrar isso?",
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
          contexto: questao.contexto,
          enunciado: questao.enunciado,
          gabarito: questao.gabarito,
          comentario: questao.comentario,
          resposta: questao.resposta,
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
                questao.gabarito ? "bg-green/15 text-green" : "bg-red/15 text-red"
              }`}
            >
              Gabarito: {questao.gabarito ? "Certo" : "Errado"}
            </span>
          </div>
          <p className="line-clamp-3 text-xs leading-relaxed text-dim">{questao.enunciado}</p>
        </div>
      }
      onClose={onClose}
    />
  );
}
