import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties } from "react";
import { CARACTERES_POR_LINHA } from "./paragrafos";

// Texto de amostra para medir a largura média de um caractere na fonte da caixa
// (português corrido, com espaços e pontuação, como numa redação).
const AMOSTRA =
  "A segurança pública é dever do Estado, direito e responsabilidade de todos, e a integração entre as polícias ajuda a esclarecer crimes e a reduzir a violência no país.";
const PAD_X = 10;
const PAD_Y = 6;
const NUMEROS = 26; // largura da coluna com o número da linha
const FONTE_MAX = 16;
const ALTURA_LINHA = 1.9; // em relação ao tamanho da letra

/**
 * Campo de escrita que imita a folha de redação: cada linha da tela comporta o mesmo
 * que uma linha manuscrita (CARACTERES_POR_LINHA), com as linhas numeradas. Para isso a
 * caixa tem a largura de uma linha e, em tela estreita, a letra diminui em vez de a
 * linha encolher. As linhas contadas são as que aparecem na tela.
 */
export function FolhaRedacao({
  value,
  onChange,
  disabled,
  meta,
  onLinhas,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  meta: [number, number];
  onLinhas: (n: number) => void;
}) {
  const caixaRef = useRef<HTMLDivElement>(null);
  const textoRef = useRef<HTMLTextAreaElement>(null);
  const [medida, setMedida] = useState<{ fonte: number; largura: number } | null>(null);
  const [linhas, setLinhas] = useState(0);

  // Mede a letra e o espaço disponível; refaz ao mudar a largura da tela e quando a fonte carrega.
  useEffect(() => {
    const caixa = caixaRef.current;
    const area = textoRef.current;
    if (!caixa || !area) return;
    const canvas = document.createElement("canvas");
    const medir = () => {
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      const cs = getComputedStyle(area);
      ctx.font = `${cs.fontWeight} 100px ${cs.fontFamily}`;
      const porPx = ctx.measureText(AMOSTRA).width / AMOSTRA.length / 100;
      const disponivel = caixa.clientWidth - NUMEROS - 2 * PAD_X - 2;
      const fonte = Math.min(FONTE_MAX, disponivel / (porPx * CARACTERES_POR_LINHA));
      setMedida({ fonte, largura: porPx * fonte * CARACTERES_POR_LINHA });
    };
    medir();
    document.fonts?.ready.then(medir).catch(() => {});
    const obs = new ResizeObserver(medir);
    obs.observe(caixa);
    window.addEventListener("resize", medir);
    return () => {
      obs.disconnect();
      window.removeEventListener("resize", medir);
    };
  }, []);

  const alturaLinha = medida ? medida.fonte * ALTURA_LINHA : 28;

  // Linhas que o texto ocupa na própria caixa: zera a altura por um instante (antes de
  // pintar a tela) e lê a altura do conteúdo.
  useLayoutEffect(() => {
    const area = textoRef.current;
    if (!area || !medida) return;
    let n = 0;
    if (value.trim()) {
      const altura = area.style.height;
      area.style.height = "0px";
      n = Math.round((area.scrollHeight - 2 * PAD_Y) / alturaLinha);
      area.style.height = altura;
    }
    setLinhas(n);
    onLinhas(n);
  }, [value, medida, alturaLinha, onLinhas]);

  const total = Math.max(meta[1] + 2, linhas + 1);
  const estiloTexto = medida
    ? { fontSize: `${medida.fonte}px`, lineHeight: `${alturaLinha}px`, width: `${medida.largura + 2 * PAD_X + 2}px` }
    : undefined;

  return (
    <div ref={caixaRef} className="mt-3 w-full">
      <div className="mx-auto flex w-fit max-w-full" style={{ visibility: medida ? "visible" : "hidden" }}>
        {/* números das linhas, como na folha; acima da meta ficam em âmbar */}
        <div className="shrink-0 select-none text-right" style={{ width: NUMEROS, paddingTop: PAD_Y + 1 }} aria-hidden>
          {Array.from({ length: total }, (_, i) => (
            <div
              key={i}
              className={`pr-2 text-[10px] tabular-nums ${
                i + 1 > meta[1] ? "text-amber/80" : i + 1 >= meta[0] ? "text-green/80" : "text-mut"
              }`}
              style={{ height: alturaLinha, lineHeight: `${alturaLinha}px` }}
            >
              {i + 1}
            </div>
          ))}
        </div>
        <textarea
          ref={textoRef}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          placeholder="Escreva o parágrafo aqui…"
          spellCheck={false}
          className="folha-paragrafo block resize-none overflow-hidden rounded-lg border border-line bg-navy-900 text-txt outline-none transition-colors placeholder:text-mut focus:border-gold/60 focus:ring-2 focus:ring-gold/15 disabled:opacity-60"
          style={
            {
              ...estiloTexto,
              height: total * alturaLinha + 2 * PAD_Y + 2,
              paddingLeft: PAD_X,
              paddingRight: PAD_X,
              paddingTop: PAD_Y,
              paddingBottom: PAD_Y,
              "--pauta": `${alturaLinha}px`,
              backgroundPosition: `0 ${PAD_Y}px`,
            } as CSSProperties
          }
        />
      </div>
    </div>
  );
}
