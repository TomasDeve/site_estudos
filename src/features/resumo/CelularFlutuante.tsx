import { lazy, Suspense, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Smartphone } from "lucide-react";
import { useResumoAnkiFaltam } from "@/api/questoesAnki";
import { Spinner } from "@/components/Spinner";
import {
  EVENTO_ABRIR_CELULAR,
  telaDoPedido,
  telaPai,
  type PedidoCelular,
  type TelaCelular,
} from "./celularNavegacao";

// O celular só baixa quando é puxado (e assim não entra no pacote das páginas de questões).
const CelularResumo = lazy(() => import("./CelularResumo").then((m) => ({ default: m.CelularResumo })));

/**
 * O celular "no bolso" das páginas de questões. O botão do canto mostra quantas
 * questões do resumo faltam ir para o Anki e puxa o celular, que sobe do rodapé como
 * no GTA (no computador fica no canto, com a página livre atrás). O "Ver no celular"
 * do aviso de "Adicionado ao resumo" também o puxa, já na questão.
 */
export function CelularFlutuante({ materiaInicial }: { materiaInicial?: string }) {
  const [tela, setTela] = useState<TelaCelular | null>(null);
  const { data: faltam } = useResumoAnkiFaltam();

  useEffect(() => {
    const h = (e: Event) => {
      e.preventDefault(); // avisa que esta página tem o celular (não abre aba nova)
      setTela(telaDoPedido((e as CustomEvent<PedidoCelular>).detail ?? {}));
    };
    window.addEventListener(EVENTO_ABRIR_CELULAR, h);
    return () => window.removeEventListener(EVENTO_ABRIR_CELULAR, h);
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
        title="Celular do resumo: o que já foi e o que falta ir pro Anki"
        aria-label={`Celular do resumo${faltam ? ` — ${faltam} faltam ir pro Anki` : ""}`}
      >
        <Smartphone className="size-5" />
        {!!faltam && (
          <span className="absolute -right-1 -top-1 min-w-5 rounded-full bg-gold px-1 text-center text-[10px] font-bold leading-5 tabular-nums text-navy-950 ring-2 ring-navy-950">
            {faltam > 99 ? "99+" : faltam}
          </span>
        )}
      </button>

      {tela &&
        createPortal(
          <div className="fixed inset-0 z-50 sm:inset-auto sm:bottom-4 sm:right-4">
            <div className="celular-subir h-full">
              <Suspense
                fallback={
                  <div className="flex h-dvh w-full items-center justify-center bg-navy-950 sm:h-[min(730px,calc(100dvh-2rem))] sm:w-[372px] sm:rounded-[3.25rem]">
                    <Spinner />
                  </div>
                }
              >
                <CelularResumo
                  modo="flutuante"
                  tela={tela}
                  irPara={(t) => setTela(t)}
                  voltar={() => setTela(telaPai(tela))}
                  onFechar={() => setTela(null)}
                />
              </Suspense>
            </div>
          </div>,
          document.body
        )}
    </>
  );
}
