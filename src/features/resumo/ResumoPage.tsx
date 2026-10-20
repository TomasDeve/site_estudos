import { useEffect } from "react";
import { useLocation, useNavigate, useSearchParams } from "react-router";
import { QuadroResumo } from "./QuadroResumo";
import { paramsDaTela, telaDosParams, telaPai, type TelaResumo } from "./navegacaoResumo";

/**
 * Página do quadro do resumo (aba própria, como Questões e Impressão), ocupando a tela
 * toda. A tela aberta mora na URL (?m=matéria&f=filtro&q=questão), então o "voltar" do
 * navegador e o gesto do Android voltam dentro do quadro, e dá para abrir direto numa
 * matéria ou questão.
 */
export function ResumoPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const location = useLocation();
  const tela = telaDosParams(params);

  useEffect(() => {
    const anterior = document.title;
    document.title = "Resumo → Anki";
    return () => {
      document.title = anterior;
    };
  }, []);

  // Telas abertas por dentro entram no histórico marcadas: o voltar do quadro usa o
  // do navegador. Aberta direto por link, o voltar troca pela tela de cima.
  const abertaPorDentro = (location.state as { quadro?: boolean } | null)?.quadro === true;

  function irPara(t: TelaResumo, opcoes?: { substituir?: boolean }) {
    const busca = paramsDaTela(t);
    if (busca === location.search) return;
    navigate(
      { search: busca },
      opcoes?.substituir ? { replace: true, state: location.state } : { state: { quadro: true } }
    );
  }

  function voltar() {
    if (tela.tipo === "inicio") return;
    if (abertaPorDentro) navigate(-1);
    else navigate({ search: paramsDaTela(telaPai(tela)) }, { replace: true });
  }

  // O ← da tela inicial: a aba foi aberta pelo menu, então fecha; se o navegador não
  // deixar fechar, vai para o site.
  function sair() {
    window.close();
    window.setTimeout(() => navigate("/"), 150);
  }

  return (
    <div className="flex h-dvh flex-col">
      <QuadroResumo modo="pagina" tela={tela} irPara={irPara} voltar={voltar} onSair={sair} />
    </div>
  );
}
