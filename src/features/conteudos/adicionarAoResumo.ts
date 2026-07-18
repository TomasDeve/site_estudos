import { useState } from "react";
import { toast } from "sonner";
import type { TopicoQuestao } from "@/types/db";
import { useAnexarResumoQuestoes } from "@/api/topicoTextos";
import { fetchIA } from "./ChatIA";
import { anexarAoResumoAberto, chaveDestinoResumo } from "./ResumoRapido";

/** Converte as linhas devolvidas pela IA em blocos HTML do editor de resumos. */
function paraHtml(texto: string): string {
  const esc = (s: string) =>
    s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  return texto
    .split("\n")
    .map((l) => l.trim())
    .filter(Boolean)
    .map((l) => `<div>${esc(l)}</div>`)
    .join("");
}

interface Args {
  questao: TopicoQuestao;
  materiaNome?: string;
  assunto?: string;
  /** Onde o trecho entra: resumo do assunto (caderno) ou da matéria (misturado). */
  destino: { topicoId?: string; materiaId?: string };
}

/**
 * "Adicionar ao resumo": a IA condensa o aprendizado da questão em 1–3 linhas
 * (chamada curta, sem streaming) e o trecho é anexado ao resumo rápido do
 * destino — pelo editor aberto na tela, se houver, ou direto no banco.
 */
export function useAdicionarQuestaoAoResumo() {
  const anexarNoBanco = useAnexarResumoQuestoes();
  const [pendenteId, setPendenteId] = useState<string | null>(null);

  async function adicionar({ questao, materiaNome, assunto, destino }: Args) {
    if (pendenteId) return;
    if (!destino.topicoId && !destino.materiaId) {
      toast.error("Não achei onde guardar este resumo.");
      return;
    }
    setPendenteId(questao.id);
    try {
      const res = await fetchIA({
        acao: "resumir",
        materia: materiaNome ?? null,
        assunto: assunto ?? null,
        questao: {
          contexto: questao.contexto,
          enunciado: questao.enunciado,
          gabarito: questao.gabarito,
          comentario: questao.comentario,
          resposta: questao.resposta,
        },
        mensagens: [
          { role: "user", content: "Gere o trecho para eu adicionar ao meu resumo." },
        ],
      });
      const texto = (await res.text()).trim();
      if (!texto) throw new Error("A IA não devolveu nada — tente de novo.");

      const html = paraHtml(texto);
      if (!anexarAoResumoAberto(chaveDestinoResumo(destino), html)) {
        await anexarNoBanco.mutateAsync({ ...destino, html });
      }
      toast.success("Adicionado ao resumo 📝");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPendenteId(null);
    }
  }

  return { adicionar, pendenteId };
}
