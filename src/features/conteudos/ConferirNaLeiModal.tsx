import { useState } from "react";
import { BookOpen, Maximize2 } from "lucide-react";
import type { TopicoQuestao } from "@/types/db";
import { useIndiceTextosDoTopico, useTexto } from "@/api/topicoTextos";
import { Modal } from "@/components/Modal";
import { Spinner } from "@/components/Spinner";
import { EmptyState } from "@/components/EmptyState";
import { TextoReader } from "./TextoReader";
import { apenasLeis, artigoDaFonte, escolherTexto } from "./leiDaQuestao";

interface Props {
  questao: TopicoQuestao;
  topicoId: string;
  /** Número da questão no caderno, quando a página numera. */
  numero?: number;
  onClose: () => void;
}

/**
 * "Conferir na lei": abre o texto que já está salvo no assunto, rolado no
 * artigo que a questão cita, no mesmo leitor de sempre — ou seja, dá para
 * marcar, sublinhar e anotar ali mesmo, que tudo é salvo no texto.
 */
export function ConferirNaLeiModal({ questao, topicoId, numero, onClose }: Props) {
  const artigo = artigoDaFonte(questao.fonte);
  const { data: indice, isLoading } = useIndiceTextosDoTopico(topicoId);
  const [escolhido, setEscolhido] = useState<string | null>(null);
  const [achouArtigo, setAchouArtigo] = useState(true);

  // O resumo das questões segue na lista (dá para conferir o que já anotou),
  // mas fica de fora da escolha automática — lei é lei.
  const alvoId = escolhido ?? escolherTexto(apenasLeis(indice ?? []), artigo);
  const { data: texto, isLoading: carregandoTexto } = useTexto(alvoId ?? undefined);

  function trocar(id: string) {
    setEscolhido(id);
    setAchouArtigo(true);
  }

  return (
    <Modal
      open
      onClose={onClose}
      width="max-w-3xl"
      title={
        <span className="flex min-w-0 items-center gap-2">
          <BookOpen className="size-4 shrink-0 text-gold" />
          <span className="truncate">{texto?.titulo ?? "Conferir na lei"}</span>
        </span>
      }
    >
      {/* A questão fica à vista para comparar palavra por palavra com a lei */}
      <div className="mb-3 rounded-lg border border-line/50 bg-navy-900/60 px-3 py-2.5">
        <p className="line-clamp-3 text-xs leading-relaxed text-dim">{questao.enunciado}</p>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px]">
          {numero != null && <span className="font-bold uppercase text-mut">Questão {numero}</span>}
          <span className="text-dim">
            Gabarito:{" "}
            <strong className={questao.gabarito ? "text-green" : "text-red"}>
              {questao.gabarito ? "CERTO" : "ERRADO"}
            </strong>
          </span>
          {questao.fonte && <span className="text-mut">{questao.fonte}</span>}
          {artigo != null && texto && (
            <span className={achouArtigo ? "text-blue" : "text-amber"}>
              {achouArtigo
                ? `Abri no art. ${artigo}`
                : `Não achei o art. ${artigo} neste texto`}
            </span>
          )}
        </div>
      </div>

      {isLoading ? (
        <div className="flex justify-center py-10">
          <Spinner className="size-6" />
        </div>
      ) : (indice ?? []).length === 0 ? (
        <EmptyState
          icon="📖"
          title="Nenhum texto salvo neste assunto"
          message="Cole a lei em Conteúdos → o assunto → “Textos e resumos”. Depois disso, o “Conferir na lei” abre direto aqui, já no artigo da questão."
        />
      ) : (
        <div className="space-y-2.5">
          {/* Com mais de um texto no assunto, dá para pular entre eles */}
          {(indice ?? []).length > 1 && (
            <div className="flex flex-wrap gap-1.5">
              {(indice ?? []).map((t) => (
                <button
                  key={t.id}
                  onClick={() => trocar(t.id)}
                  className={`max-w-full cursor-pointer truncate rounded-lg border px-2.5 py-1.5 text-[11px] font-semibold transition-colors ${
                    t.id === alvoId
                      ? "border-gold/40 bg-gold/10 text-gold"
                      : "border-line/60 text-dim hover:border-line hover:bg-navy-700/60 hover:text-txt"
                  }`}
                  title={t.titulo}
                >
                  {t.titulo}
                </button>
              ))}
            </div>
          )}

          {alvoId == null ? (
            <p className="py-8 text-center text-sm text-mut">
              Este assunto tem mais de um texto. Escolha acima qual conferir.
            </p>
          ) : carregandoTexto || !texto ? (
            <div className="flex justify-center py-10">
              <Spinner className="size-6" />
            </div>
          ) : (
            <TextoReader
              texto={texto}
              artigoFoco={artigo}
              onArtigoFoco={setAchouArtigo}
              acoes={
                <a
                  href={`/texto/${texto.id}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-dim transition-colors hover:border-gold/50 hover:text-gold"
                  title="Abrir o texto inteiro em tela cheia, numa nova aba"
                >
                  <Maximize2 className="size-3.5" />
                  <span className="max-sm:hidden">Tela cheia</span>
                </a>
              }
            />
          )}
        </div>
      )}
    </Modal>
  );
}
