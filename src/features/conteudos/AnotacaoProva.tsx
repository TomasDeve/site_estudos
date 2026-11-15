import { useState } from "react";
import { FileText, PenLine } from "lucide-react";
import type { TopicoQuestao } from "@/types/db";

/**
 * O que o aluno deixou na prova impressa (simulados): as marcas e notas da
 * folha, o recorte da foto da questão e a questão real que serviu de base.
 * Só aparece depois de responder, abaixo do comentário (campos `anotacao`,
 * `anotacao_imagem` e `questao_base`; vazios = nada na tela).
 */
const ROTULO = /^(Dúvida|Chute|Marcou|Anotações|Obs\.)(?=:)/;

function Linha({ texto }: { texto: string }) {
  const m = texto.match(ROTULO);
  if (!m) return <p>{texto}</p>;
  const rotulo = m[0];
  const cor =
    rotulo === "Chute" ? "text-red" : rotulo === "Dúvida" ? "text-gold" : rotulo === "Obs." ? "text-blue" : "text-txt";
  return (
    <p>
      <span className={`font-semibold ${cor}`}>{rotulo}</span>
      {texto.slice(rotulo.length)}
    </p>
  );
}

export function AnotacaoProva({ questao: q }: { questao: TopicoQuestao }) {
  const [zoom, setZoom] = useState(false);
  if (!q.anotacao && !q.anotacao_imagem && !q.questao_base) return null;
  const linhas = (q.anotacao ?? "")
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);

  return (
    <div className="space-y-2">
      {(linhas.length > 0 || q.anotacao_imagem) && (
        <div className="border-l-2 border-blue/60 pl-2.5">
          <p className="mb-0.5 flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-blue">
            <PenLine className="size-3" /> Na sua prova
          </p>
          {linhas.length > 0 && (
            <div className="space-y-1 text-xs leading-relaxed text-dim">
              {linhas.map((l, i) => (
                <Linha key={i} texto={l} />
              ))}
            </div>
          )}
          {q.anotacao_imagem && (
            <>
              <button
                type="button"
                onClick={() => setZoom(true)}
                className="mt-2 block w-full cursor-zoom-in overflow-hidden rounded-lg border border-line/40 bg-white"
                title="Ampliar"
              >
                <img src={q.anotacao_imagem} alt="Recorte da questão na prova" loading="lazy" className="mx-auto max-h-[360px] w-auto" />
              </button>
              {zoom && (
                <div
                  className="fixed inset-0 z-50 flex cursor-zoom-out items-center justify-center bg-black/85 p-3"
                  onClick={() => setZoom(false)}
                >
                  <img src={q.anotacao_imagem} alt="" className="max-h-full max-w-full rounded-lg" />
                </div>
              )}
            </>
          )}
        </div>
      )}

      {q.questao_base && (
        <details className="group rounded-lg border border-line/40 bg-navy-950/40 px-2.5 py-2">
          <summary className="flex cursor-pointer list-none items-center gap-1 text-[10px] font-bold uppercase tracking-wide text-mut">
            <FileText className="size-3" /> Questão-base (como a banca publicou)
            <span className="ml-auto text-[10px] font-semibold normal-case tracking-normal group-open:hidden">ver</span>
          </summary>
          <p className="mt-2 whitespace-pre-wrap text-xs leading-relaxed text-dim">{q.questao_base}</p>
        </details>
      )}
    </div>
  );
}
