import { useCallback, useState } from "react";
import { toast } from "sonner";
import type { TopicoQuestao } from "@/types/db";
import { useAnexarResumoQuestoes } from "@/api/topicoTextos";
import { anexarAoResumoAberto, chaveDestinoResumo } from "./ResumoRapido";
import { envolverBlocoQuestao } from "./resumoBlocos";
import { cabecalhoFonte } from "./fonteQuestao";
import { alternativasRiscadas } from "./grifos";
import { alternativasDe, ehMultipla, gabaritoLabel } from "./questaoModelo";

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/**
 * Converte um texto (possivelmente com várias linhas) em `<div>` por linha, com
 * as linhas em branco colapsadas num único respiro (`<div><br></div>`). `em`
 * envolve cada linha em itálico (usado no comando/contexto da questão).
 */
function divsDeTexto(texto: string, em = false): string[] {
  const linhas = texto.replace(/\r\n?/g, "\n").split("\n").map((l) => l.trim());
  const out: string[] = [];
  let espaco = false;
  let comecou = false;
  for (const l of linhas) {
    if (!l) {
      if (comecou) espaco = true; // colapsa vazias e ignora as do começo
      continue;
    }
    if (espaco) {
      out.push("<div><br></div>");
      espaco = false;
    }
    out.push(`<div>${em ? `<em>${esc(l)}</em>` : esc(l)}</div>`);
    comecou = true;
  }
  return out;
}

/**
 * Monta o bloco do resumo copiando a QUESTÃO como ela é — sem passar pela IA. A
 * ordem reproduz o card: cabeçalho (Q… · ano (BANCA) - cargo), comando/contexto,
 * enunciado, a "Dúvida" (na múltipla escolha, as alternativas que o aluno NÃO
 * riscou — as que ficaram em aberto) e, por fim, a RESPOSTA (o comentário-resposta).
 * Abre com `<hr>` separando este bloco do anterior.
 */
function montarBlocoQuestao(q: TopicoQuestao): string {
  const partes: string[] = ["<hr>"];
  const respiro = () => {
    if (partes.length > 1) partes.push("<div><br></div>");
  };

  if (q.fonte?.trim()) {
    partes.push(`<div><strong>${esc(cabecalhoFonte(q.fonte))}</strong></div>`);
  }

  if (q.contexto?.trim()) {
    respiro();
    partes.push(...divsDeTexto(q.contexto, true));
  }

  if (q.enunciado?.trim()) {
    respiro();
    partes.push(...divsDeTexto(q.enunciado));
  }

  // Múltipla escolha: entra a "Dúvida" — as alternativas que o aluno NÃO riscou
  // (as que sobraram em aberto), para a questão ir ao resumo/Anki já focada no que
  // ele hesitou. Se não riscou nada (ou riscou tudo), cai para todas as alternativas.
  if (ehMultipla(q)) {
    const alts = alternativasDe(q);
    const riscadas = new Set(alternativasRiscadas(q.grifos));
    const emDuvida = alts.filter((a) => !riscadas.has(a.letra));
    const mostrar = emDuvida.length ? emDuvida : alts;
    if (mostrar.length) {
      respiro();
      partes.push("<div><strong>Dúvida:</strong></div>", "<div><br></div>");
      mostrar.forEach((a, i) => {
        if (i > 0) partes.push("<div><br></div>");
        partes.push(`<div>${esc(a.letra)}) ${esc(a.texto)}</div>`);
      });
    }
  }

  // Resposta: o comentário-resposta. Sem comentário, ao menos o gabarito.
  const resposta = q.comentario?.trim() || gabaritoLabel(q);
  respiro();
  partes.push("<div><strong>RESPOSTA:</strong></div>", "<div><br></div>");
  partes.push(...divsDeTexto(resposta));

  // Só o "<hr>" = questão sem nada aproveitável; não grava linha solta.
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
 * "Adicionar ao resumo": copia a questão inteira (enunciado + alternativas) e o
 * comentário-resposta para o resumo rápido do destino — pelo editor aberto na
 * tela, se houver, ou direto no banco. Não usa IA, para economizar tokens: o
 * bloco vai cru, pronto para virar cards no resumo geral depois.
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

  async function adicionar({ questao, destino }: Args) {
    if (pendenteId) return;
    if (!destino.topicoId && !destino.materiaId) {
      toast.error("Não achei onde guardar este resumo.");
      return;
    }
    setPendenteId(questao.id);
    try {
      const html = montarBlocoQuestao(questao);
      if (!html) throw new Error("Esta questão não tem conteúdo para adicionar.");
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
