import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { TopicoQuestao } from "@/types/db";
import { useAnexarResumoQuestoes } from "@/api/topicoTextos";
import { fetchIA } from "./ChatIA";
import { anexarAoResumoAberto, chaveDestinoResumo } from "./ResumoRapido";
import { envolverBlocoQuestao } from "./resumoBlocos";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** Tira qualquer marcador de lista/seta que a IA tenha posto no início da linha. */
const semMarcador = (l: string) => l.replace(/^(?:—>|->|→|[-–—•*·])\s*/, "");

/** Rótulo de um sub-bloco: uma linha que termina em ":" (ex.: "Casos (art. 7º):"). */
const ehRotulo = (l: string) => /:$/.test(l);

/**
 * Monta o bloco esquematizado que entra no resumo a partir do texto da IA:
 * uma linha divisória (`<hr>`) separando este núcleo do anterior, a linha do
 * núcleo com seta (→) e, à volta, os pontos vizinhos agrupados. Cada grupo abre
 * com um rótulo em negrito (a linha "Alguma coisa:") e traz seus itens logo
 * abaixo, um por linha com travessão (—). Um respiro (linha em branco) separa o
 * núcleo e cada grupo.
 */
function montarBlocoResumo(texto: string): string {
  const linhas = texto.split("\n").map((l) => semMarcador(l.trim()));
  const partes: string[] = ["<hr>"];
  let primeira = true;
  let espacoPendente = false;

  for (const linha of linhas) {
    if (!linha) {
      if (!primeira) espacoPendente = true; // colapsa vazias e ignora as do começo
      continue;
    }

    // Rótulo de grupo (linha "…:") sempre ganha um respiro antes, para descolar
    // do núcleo ou do grupo anterior.
    const rotulo = !primeira && ehRotulo(linha);
    if (rotulo) espacoPendente = true;

    if (espacoPendente) {
      partes.push("<div><br></div>");
      espacoPendente = false;
    }

    if (primeira) {
      partes.push(`<div>→ ${esc(linha)}</div>`); // núcleo
    } else if (rotulo) {
      partes.push(`<div><strong>${esc(linha)}</strong></div>`); // rótulo do grupo
    } else {
      partes.push(`<div>— ${esc(linha)}</div>`); // item
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
 * "Adicionar ao resumo": a IA condensa o aprendizado da questão num esquema
 * curto e objetivo (núcleo + informações em volta) e o bloco é anexado ao resumo
 * rápido do destino — pelo editor aberto na tela, se houver, ou direto no banco.
 */
export function useAdicionarQuestaoAoResumo() {
  const anexarNoBanco = useAnexarResumoQuestoes();
  const [pendenteId, setPendenteId] = useState<string | null>(null);
  // Questões adicionadas nesta sessão: o botão vira "No resumo" na hora, sem
  // esperar o resumo ser relido do banco. `esquecer` desfaz ao remover o trecho.
  const [adicionadas, setAdicionadas] = useState<ReadonlySet<string>>(new Set());

  const esquecer = useCallback((questaoId: string) => {
    setAdicionadas((s) => {
      if (!s.has(questaoId)) return s;
      const n = new Set(s);
      n.delete(questaoId);
      return n;
    });
  }, []);

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
        mensagens: [
          { role: "user", content: "Gere o trecho para eu adicionar ao meu resumo." },
        ],
      });
      const texto = (await res.text()).trim();
      if (!texto) throw new Error("A IA não devolveu nada — tente de novo.");

      const html = montarBlocoResumo(texto);
      if (!html) throw new Error("A IA não devolveu nada — tente de novo.");
      // Marca o trecho com o id da questão para o "No resumo" achar depois.
      const bloco = envolverBlocoQuestao(html, questao.id);
      if (!anexarAoResumoAberto(chaveDestinoResumo(destino), bloco)) {
        await anexarNoBanco.mutateAsync({ ...destino, html: bloco });
      }
      setAdicionadas((s) => new Set(s).add(questao.id));
      toast.success("Adicionado ao resumo 📝");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : String(err));
    } finally {
      setPendenteId(null);
    }
  }

  return { adicionar, pendenteId, adicionadas, esquecer };
}
