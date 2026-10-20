import { useEffect, type ReactNode } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { CelularResumo } from "./CelularResumo";
import { paramsDaTela, telaDosParams, telaPai, type TelaCelular } from "./celularNavegacao";

/**
 * Página do celular do resumo (aba própria, como Questões e Impressão): o celular no
 * meio da tela — no celular de verdade, ele é a tela. A tela aberta mora na URL
 * (?m=matéria&f=filtro&q=questão), então o "voltar" do navegador e o gesto do
 * Android voltam dentro do celular, e dá para abrir direto numa matéria ou questão.
 */
export function ResumoCelularPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tela = telaDosParams(params);

  useEffect(() => {
    const anterior = document.title;
    document.title = "Resumo · Celular";
    return () => {
      document.title = anterior;
    };
  }, []);

  // Telas abertas por dentro entram no histórico marcadas: o voltar do celular usa o
  // do navegador. Aberta direto por link, o voltar troca pela tela de cima.
  const abertaPorDentro = (location.state as { celular?: boolean } | null)?.celular === true;

  function irPara(t: TelaCelular, opcoes?: { substituir?: boolean }) {
    const busca = paramsDaTela(t);
    if (busca === location.search) return;
    navigate(
      { search: busca },
      opcoes?.substituir ? { replace: true, state: location.state } : { state: { celular: true } }
    );
  }

  function voltar() {
    if (tela.tipo === "inicio") return;
    if (abertaPorDentro) navigate(-1);
    else navigate({ search: paramsDaTela(telaPai(tela)) }, { replace: true });
  }

  return (
    <div className="flex min-h-dvh items-center justify-center gap-12 sm:p-6">
      {/* contrapeso da legenda: deixa o celular no centro */}
      <div aria-hidden className="hidden w-56 shrink-0 xl:block" />
      <CelularResumo modo="pagina" tela={tela} irPara={irPara} voltar={voltar} />
      <Legenda />
    </div>
  );
}

function Legenda() {
  return (
    <aside className="hidden w-56 shrink-0 space-y-6 text-xs leading-relaxed text-mut xl:block">
      <div>
        <Titulo>Cores</Titulo>
        <ul className="space-y-2">
          <Item cor="var(--color-gold)">Falta ir pro Anki</Item>
          <Item cor="var(--color-green)">Já está no Anki</Item>
          <Item cor="var(--color-mut)">Não vai (ignorada) ou fora do edital</Item>
        </ul>
      </div>
      <div>
        <Titulo>Atalhos</Titulo>
        <ul className="space-y-1.5">
          <li>
            <Tecla>↑</Tecla> <Tecla>↓</Tecla> <Tecla>←</Tecla> <Tecla>→</Tecla> andar
          </li>
          <li>
            <Tecla>Enter</Tecla> abrir
          </li>
          <li>
            <Tecla>Esc</Tecla> voltar
          </li>
          <li>
            Na questão, <Tecla>←</Tecla> <Tecla>→</Tecla> passam para a anterior/próxima
          </li>
        </ul>
      </div>
      <p>
        A importação para o Anki pinta de verde sozinha. Fez o card por fora? Abra a questão e toque
        em <span className="font-semibold text-dim">Já está no Anki</span>.
      </p>
    </aside>
  );
}

function Titulo({ children }: { children: ReactNode }) {
  return <p className="mb-2 text-[10.5px] font-bold uppercase tracking-[0.14em] text-dim">{children}</p>;
}

function Item({ cor, children }: { cor: string; children: ReactNode }) {
  return (
    <li className="flex items-center gap-2">
      <span className="size-3 shrink-0 rounded-[4px]" style={{ background: cor }} />
      {children}
    </li>
  );
}

function Tecla({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-flex min-w-5 items-center justify-center rounded-md border border-line/70 bg-navy-800 px-1 py-px font-sans text-[10px] font-semibold text-dim">
      {children}
    </kbd>
  );
}
