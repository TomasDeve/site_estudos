import { useEffect, useMemo, useRef, useState } from "react";
import { BookOpen, ChevronRight, Maximize2, Sparkles, Target } from "lucide-react";
import type { Topico, TopicoTexto } from "@/types/db";
import { TITULO_RESUMO_QUESTOES } from "@/api/topicoTextos";
import { idsNoResumo } from "./resumoBlocos";
import { Modal } from "@/components/Modal";
import { EmptyState } from "@/components/EmptyState";
import { STATUS_INFO } from "./statusInfo";

interface Props {
  open: boolean;
  onClose: () => void;
  materiaNome: string;
  /** Assuntos da matéria, já na ordem do edital. */
  topicos: Topico[];
  /** Todos os textos/resumos da matéria, indexados pelo id do assunto. */
  textosPorTopico: Map<string, TopicoTexto[]>;
}

interface TextoView {
  texto: TopicoTexto;
  /** É um "Resumo das questões" (criado pelo "Adicionar ao resumo"). */
  ehResumoQuestoes: boolean;
  /** Quantas questões já foram adicionadas neste resumo. */
  nQuestoes: number;
}

interface Grupo {
  topico: Topico;
  textos: TextoView[];
}

/**
 * Painel "Resumos dos assuntos": junta, num lugar só, os resumos de todos os
 * assuntos da matéria — grupo por assunto, na ordem do edital. Serve para varrer
 * o que já foi anotado (principalmente o que veio do "Adicionar ao resumo") sem
 * abrir assunto por assunto, ideal para depois virar cards no Anki.
 *
 * Os "Resumo das questões" já abrem expandidos (são curtos); os demais textos —
 * como leis inteiras — começam recolhidos para não pesar a tela.
 */
export function ResumosDaMateriaModal({
  open,
  onClose,
  materiaNome,
  topicos,
  textosPorTopico,
}: Props) {
  const [soResumos, setSoResumos] = useState(false);
  const [abertos, setAbertos] = useState<ReadonlySet<string>>(new Set());

  // Monta os grupos (assunto → seus textos) na ordem do edital, contando as
  // questões de cada "Resumo das questões".
  const grupos = useMemo<Grupo[]>(() => {
    const out: Grupo[] = [];
    for (const topico of topicos) {
      const textos = [...(textosPorTopico.get(topico.id) ?? [])].sort(
        (a, b) => a.ordem - b.ordem || a.created_at.localeCompare(b.created_at)
      );
      if (textos.length === 0) continue;
      const views: TextoView[] = textos.map((texto) => {
        const ehResumoQuestoes = texto.titulo === TITULO_RESUMO_QUESTOES;
        return {
          texto,
          ehResumoQuestoes,
          nQuestoes: ehResumoQuestoes ? idsNoResumo(texto.conteudo).size : 0,
        };
      });
      out.push({ topico, textos: views });
    }
    return out;
  }, [topicos, textosPorTopico]);

  // Aplica o filtro "só resumos de questões".
  const gruposVisiveis = useMemo<Grupo[]>(() => {
    if (!soResumos) return grupos;
    return grupos
      .map((g) => ({ ...g, textos: g.textos.filter((t) => t.ehResumoQuestoes) }))
      .filter((g) => g.textos.length > 0);
  }, [grupos, soResumos]);

  const totalTextos = useMemo(
    () => gruposVisiveis.reduce((s, g) => s + g.textos.length, 0),
    [gruposVisiveis]
  );

  // Quais textos abrir por padrão: os "Resumo das questões" (curtos e é o que se
  // quer ler); leis e textos longos começam recolhidos.
  const autoAbertos = useMemo(() => {
    const s = new Set<string>();
    for (const g of grupos) {
      for (const t of g.textos) if (t.ehResumoQuestoes) s.add(t.texto.id);
    }
    return s;
  }, [grupos]);

  // Só reinicia o estado de aberto/recolhido quando o modal ABRE — não a cada
  // recarga dos dados, para não desfazer o que o usuário expandiu/recolheu.
  const estavaAberto = useRef(false);
  useEffect(() => {
    if (open && !estavaAberto.current) setAbertos(autoAbertos);
    estavaAberto.current = open;
  }, [open, autoAbertos]);

  function alternar(id: string) {
    setAbertos((s) => {
      const n = new Set(s);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      return n;
    });
  }

  const idsVisiveis = useMemo(
    () => gruposVisiveis.flatMap((g) => g.textos.map((t) => t.texto.id)),
    [gruposVisiveis]
  );
  const todosAbertos = idsVisiveis.length > 0 && idsVisiveis.every((id) => abertos.has(id));

  function expandirRecolherTudo() {
    setAbertos(todosAbertos ? new Set() : new Set(idsVisiveis));
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      width="max-w-3xl"
      title={
        <span className="flex items-center gap-2">
          <BookOpen className="size-4 text-gold" />
          Resumos dos assuntos — {materiaNome}
        </span>
      }
    >
      {grupos.length === 0 ? (
        <EmptyState
          icon="📝"
          title="Nenhum resumo ainda"
          message='Responda questões e use o "Adicionar ao resumo" para juntar aqui os trechos de cada assunto — depois você transforma tudo em cards no Anki.'
        />
      ) : (
        <div className="space-y-4">
          {/* Controles: filtro + expandir/recolher */}
          <div className="flex flex-wrap items-center justify-between gap-2">
            <label className="flex cursor-pointer items-center gap-2 text-xs text-dim">
              <input
                type="checkbox"
                checked={soResumos}
                onChange={(e) => setSoResumos(e.target.checked)}
                className="size-3.5 cursor-pointer accent-gold"
              />
              Só resumos de questões
            </label>
            {idsVisiveis.length > 0 && (
              <button
                onClick={expandirRecolherTudo}
                className="cursor-pointer rounded-lg border border-line/60 px-2.5 py-1 text-xs text-mut transition-colors hover:border-line hover:text-gold"
              >
                {todosAbertos ? "Recolher tudo" : "Expandir tudo"}
              </button>
            )}
          </div>

          {gruposVisiveis.length === 0 ? (
            <p className="py-6 text-center text-sm text-mut">
              Nenhum assunto tem resumo de questões ainda.
            </p>
          ) : (
            <p className="text-xs text-mut">
              {gruposVisiveis.length}{" "}
              {gruposVisiveis.length === 1 ? "assunto com resumo" : "assuntos com resumo"} ·{" "}
              {totalTextos} {totalTextos === 1 ? "texto" : "textos"}
            </p>
          )}

          {gruposVisiveis.map((g) => {
            const info = STATUS_INFO[g.topico.status as keyof typeof STATUS_INFO];
            return (
              <section key={g.topico.id} className="space-y-1.5">
                <h3 className="flex items-center gap-2 border-b border-line/30 pb-1.5 text-sm font-semibold text-txt">
                  <span
                    className="size-2.5 shrink-0 rounded-full border"
                    style={{
                      borderColor: info?.cor,
                      background: g.topico.status === "nao_estudado" ? "transparent" : info?.cor,
                    }}
                    aria-hidden
                  />
                  <span className="min-w-0 flex-1">{g.topico.titulo}</span>
                  <span className="shrink-0 text-[11px] font-normal tabular-nums text-mut">
                    {g.textos.length} {g.textos.length === 1 ? "texto" : "textos"}
                  </span>
                </h3>

                <ul className="space-y-1.5">
                  {g.textos.map(({ texto, ehResumoQuestoes, nQuestoes }) => {
                    const aberto = abertos.has(texto.id);
                    return (
                      <li
                        key={texto.id}
                        className="overflow-hidden rounded-lg border border-line/50 bg-navy-900/40"
                      >
                        <div className="flex items-center gap-1 px-1.5 py-1">
                          <button
                            onClick={() => alternar(texto.id)}
                            className="flex min-w-0 flex-1 items-center gap-2 rounded-md px-1.5 py-1 text-left transition-colors hover:bg-navy-700/50"
                            aria-expanded={aberto}
                          >
                            <ChevronRight
                              className={`size-3.5 shrink-0 text-mut transition-transform ${
                                aberto ? "rotate-90" : ""
                              }`}
                            />
                            {ehResumoQuestoes ? (
                              <Sparkles className="size-3.5 shrink-0 text-gold" />
                            ) : (
                              <BookOpen className="size-3.5 shrink-0 text-mut" />
                            )}
                            <span className="min-w-0 flex-1 truncate text-sm text-txt">
                              {texto.titulo}
                            </span>
                            {nQuestoes > 0 && (
                              <span
                                className="flex shrink-0 items-center gap-1 rounded-full bg-gold/10 px-1.5 py-0.5 text-[10px] font-semibold tabular-nums text-gold"
                                title={`${nQuestoes} ${nQuestoes === 1 ? "questão" : "questões"} neste resumo`}
                              >
                                <Target className="size-3" />
                                {nQuestoes}
                              </span>
                            )}
                            {texto.leituras > 0 && (
                              <span className="shrink-0 text-[10px] tabular-nums text-mut">
                                Lido {texto.leituras}x
                              </span>
                            )}
                          </button>
                          <a
                            href={`/texto/${texto.id}`}
                            target="_blank"
                            rel="noreferrer"
                            className="shrink-0 rounded-md p-1.5 text-mut transition-colors hover:bg-navy-700 hover:text-gold"
                            aria-label={`Abrir ${texto.titulo} em tela cheia`}
                            title="Abrir em tela cheia para ler, marcar e editar (nova aba)"
                          >
                            <Maximize2 className="size-3.5" />
                          </a>
                        </div>

                        {aberto && (
                          <div className="border-t border-line/30 px-3 py-3">
                            {texto.conteudo.trim() ? (
                              <div
                                className="conteudo-lei"
                                dangerouslySetInnerHTML={{ __html: texto.conteudo }}
                              />
                            ) : (
                              <p className="text-xs text-mut">Este texto está vazio.</p>
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              </section>
            );
          })}
        </div>
      )}
    </Modal>
  );
}
