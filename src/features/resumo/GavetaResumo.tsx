import { lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { LayoutGrid, Maximize2, X } from "lucide-react";
import { useResumoAnkiFaltam } from "@/api/questoesAnki";
import { Spinner } from "@/components/Spinner";
import {
  EVENTO_ABRIR_QUADRO,
  paramsDaTela,
  telaDoPedido,
  telaPai,
  type PedidoQuadro,
  type TelaResumo,
} from "./navegacaoResumo";

// O quadro só baixa quando a gaveta abre (e assim não entra no pacote das páginas de questões).
const QuadroResumo = lazy(() => import("./QuadroResumo").then((m) => ({ default: m.QuadroResumo })));

const botaoTopo =
  "shrink-0 cursor-pointer rounded-lg p-2 text-mut transition-colors hover:bg-navy-700 hover:text-txt sm:p-1.5";

/**
 * O quadro do resumo à mão nas páginas de questões. O botão do canto mostra quantas
 * questões do resumo faltam ir para o Anki e abre o quadro numa gaveta pela direita (no
 * celular, a tela toda), com a página livre atrás. O "Ver no quadro" do aviso de
 * "Adicionado ao resumo" também a abre, já na questão.
 */
export function GavetaResumo({ materiaInicial }: { materiaInicial?: string }) {
  const [tela, setTela] = useState<TelaResumo | null>(null);
  const { data: faltam } = useResumoAnkiFaltam();

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault(); // avisa que esta página tem a gaveta (não abre aba nova)
      setTela(telaDoPedido((e as CustomEvent<PedidoQuadro>).detail ?? {}));
    };
    window.addEventListener(EVENTO_ABRIR_QUADRO, h);
    return () => window.removeEventListener(EVENTO_ABRIR_QUADRO, h);
  }, []);

  function alternar() {
    if (tela) setTela(null);
    else setTela(materiaInicial ? { tipo: "app", escopo: materiaInicial, filtro: "todas" } : { tipo: "inicio" });
  }

  return (
    <>
      <button
        onClick={alternar}
        className="fixed bottom-[calc(1rem+env(safe-area-inset-bottom))] right-[4.25rem] z-40 flex size-12 cursor-pointer items-center justify-center rounded-full border border-line bg-navy-700 text-txt shadow-lg shadow-navy-950/50 transition-transform hover:scale-105 active:scale-95 sm:bottom-6 sm:right-[5.5rem]"
        title="Resumo → Anki: o que já foi e o que falta"
        aria-label={`Quadro do resumo${faltam ? ` — ${faltam} faltam ir pro Anki` : ""}`}
      >
        <LayoutGrid className="size-5" />
        {!!faltam && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-gold px-1 text-center text-[10px] font-bold leading-5 tabular-nums text-navy-950 ring-2 ring-navy-950">
            {faltam > 99 ? "99+" : faltam}
          </span>
        )}
      </button>

      {tela &&
        createPortal(
          <aside className="quadro-gaveta fixed inset-y-0 right-0 z-50 flex w-full flex-col border-l border-line/60 bg-navy-950 shadow-pop sm:w-[32rem]">
            <Suspense
              fallback={
                <div className="flex flex-1 items-center justify-center">
                  <Spinner />
                </div>
              }
            >
              <QuadroResumo
                modo="gaveta"
                tela={tela}
                irPara={(t) => setTela(t)}
                voltar={() => setTela(telaPai(tela))}
                onFechar={() => setTela(null)}
                acoesTopo={
                  <>
                    <a
                      href={`/resumo${paramsDaTela(tela)}`}
                      target="_blank"
                      rel="noreferrer"
                      className={`${botaoTopo} max-sm:hidden`}
                      title="Abrir em tela cheia (nova aba)"
                      aria-label="Abrir em tela cheia"
                    >
                      <Maximize2 className="size-4" />
                    </a>
                    <button onClick={() => setTela(null)} className={botaoTopo} title="Fechar (Esc)" aria-label="Fechar">
                      <X className="size-4" />
                    </button>
                  </>
                }
              />
            </Suspense>
          </aside>,
          document.body
        )}
    </>
  );
}
