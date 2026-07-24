import { useState } from "react";
import { toast } from "sonner";
import type { TopicoQuestao } from "@/types/db";
import { useAnexarResumoQuestoes } from "@/api/topicoTextos";
import { fetchIA } from "./ChatIA";
import { anexarAoResumoAberto, chaveDestinoResumo } from "./ResumoRapido";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Tira qualquer marcador de lista/seta que a IA tenha posto no início da linha. */
const semMarcador = (l: string) => l.replace(/^(?:—>|->|→|[-–—•*·])\s*/, "");

/**
 * Monta o bloco esquematizado que entra no resumo a partir do texto da IA:
 * uma linha divisória (`<hr>`) separando este núcleo do anterior, a linha do
 * núcleo com seta, o reforço espaçado e a pegadinha com rótulo destacado.
 * Preserva as linhas em branco da IA como respiro e garante o espaçamento
 * antes da pegadinha mesmo que ela venha colada.
 */
function montarBlocoResumo(texto: string): string {
  const linhas = texto.split("\n").map((l) => l.trim());
  const partes: string[] = ["<hr>"];
  let primeira = true;
  let espacoPendente = false;

  for (const linha of linhas) {
    if (!linha) {
      if (!primeira) espacoPendente = true; // colapsa vazias e ignora as do começo
      continue;
    }
    const peg = /^(pegadinha\b[^:]*:)\s*(.*)$/i.exec(linha);
    if (peg && !primeira) espacoPendente = true; // pegadinha sempre respira acima

    if (espacoPendente) {
      partes.push("<div><br></div>");
      espacoPendente = false;
    }

    if (peg) {
      partes.push(`<div><strong>${esc(peg[1])}</strong> ${esc(peg[2])}</div>`);
    } else if (primeira) {
      partes.push(`<div>→ ${esc(semMarcador(linha))}</div>`);
    } else {
      partes.push(`<div>${esc(semMarcador(linha))}</div>`);
    }
    primeira = false;
  }

  // Só o "<hr>" = a IA não devolveu conteúdo aproveitável; não grava linha solta.
  return partes.length > 1 ? partes.join("") : "";
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

      const html = montarBlocoResumo(texto);
      if (!html) throw new Error("A IA não devolveu nada — tente de novo.");
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
