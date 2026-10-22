import {
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type ClipboardEvent,
  type CSSProperties,
  type KeyboardEvent,
} from "react";
import { CARACTERES_POR_LINHA } from "./paragrafos";
import { SHY, hifenizar, indiceComHifens, indiceReal, semHifens } from "./silabas";

// Texto de amostra para medir a largura média de um caractere na fonte da caixa
// (português corrido, com espaços e pontuação, como numa redação).
const AMOSTRA =
  "A segurança pública é dever do Estado, direito e responsabilidade de todos, e a integração entre as polícias ajuda a esclarecer crimes e a reduzir a violência no país.";
const PAD_X = 10;
const PAD_Y = 6;
const NUMEROS = 26; // largura da coluna com o número da linha
const FONTE_MAX = 16;
// Numa linha cheia, o texto real ocupa ~93,5% da largura medida pela amostra (letras um
// pouco mais largas + a sobra no fim da linha). Medido nos 136 parágrafos modelo: assim a
// linha da tela leva os mesmos ~66 caracteres que uma linha da letra dele.
const APROVEITAMENTO = 0.935;
const LARGURA_EM_CARACTERES = CARACTERES_POR_LINHA / APROVEITAMENTO;
const ALTURA_LINHA = 1.9; // em relação ao tamanho da letra

/**
 * Campo de escrita que imita a folha de redação: cada linha da tela comporta o mesmo
 * que uma linha manuscrita (CARACTERES_POR_LINHA), com as linhas numeradas. Para isso a
 * caixa tem a largura de uma linha e, em tela estreita, a letra diminui em vez de a
 * linha encolher. As linhas contadas são as que aparecem na tela.
 *
 * A palavra que não cabe no fim da linha é separada por sílaba, como na folha: a caixa
 * mostra o texto com hífens invisíveis (silabas.ts) e devolve sempre o texto sem eles.
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
  // Enquanto o teclado do celular compõe uma palavra, a caixa fica como está (mexer no texto
  // no meio da composição bagunça o teclado); a separação volta quando a palavra termina.
  const compondo = useRef(false);
  const [textoCompondo, setTextoCompondo] = useState<string | null>(null);
  const exibido = useMemo(() => textoCompondo ?? hifenizar(value), [textoCompondo, value]);
  // Onde o cursor deve ficar depois que o texto com hífens for refeito (em caracteres reais).
  const cursor = useRef<number | null>(null);

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
      if (disponivel <= 0 || !porPx) return; // aba escondida/sem largura: mede quando aparecer
      const fonte = Math.min(FONTE_MAX, disponivel / (porPx * LARGURA_EM_CARACTERES));
      setMedida({ fonte, largura: porPx * fonte * LARGURA_EM_CARACTERES });
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
  }, [exibido, value, medida, alturaLinha, onLinhas]);

  // Põe o cursor de volta no lugar depois que o texto com hífens foi refeito.
  useLayoutEffect(() => {
    const area = textoRef.current;
    if (!area || cursor.current == null) return;
    const pos = indiceComHifens(exibido, cursor.current);
    cursor.current = null;
    area.setSelectionRange(pos, pos);
  }, [exibido]);

  const mudar = (e: ChangeEvent<HTMLTextAreaElement>) => {
    const area = e.target;
    const novo = area.value;
    if (compondo.current) {
      setTextoCompondo(novo);
      onChange(semHifens(novo));
      return;
    }
    let real = indiceReal(novo, area.selectionStart);
    let texto = semHifens(novo);
    // Backspace/Delete num hífen invisível: apaga a letra ao lado, que é o que se vê.
    if (texto === value && novo.length < exibido.length) {
      const tipo = (e.nativeEvent as InputEvent).inputType;
      if (tipo === "deleteContentBackward" && real > 0) {
        texto = value.slice(0, real - 1) + value.slice(real);
        real--;
      } else if (tipo === "deleteContentForward") {
        texto = value.slice(0, real) + value.slice(real + 1);
      }
    }
    cursor.current = real;
    if (texto === value) {
      // nada mudou de verdade: o React não redesenha, então refaz a caixa aqui
      area.value = exibido;
      const pos = indiceComHifens(exibido, real);
      area.setSelectionRange(pos, pos);
      return;
    }
    onChange(texto);
  };

  // As setas pulam o hífen invisível (senão o cursor "para" uma vez sem sair do lugar).
  const teclar = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if ((e.key !== "ArrowLeft" && e.key !== "ArrowRight") || e.shiftKey || e.ctrlKey || e.altKey || e.metaKey) return;
    const area = e.currentTarget;
    const pos = area.selectionStart;
    if (pos !== area.selectionEnd) return;
    const v = area.value;
    let novo: number | null = null;
    if (e.key === "ArrowRight" && v[pos] === SHY) novo = Math.min(v.length, pos + 2);
    if (e.key === "ArrowLeft" && v[pos - 1] === SHY) novo = Math.max(0, pos - 2);
    if (novo == null) return;
    e.preventDefault();
    area.setSelectionRange(novo, novo);
  };

  // Copiar/recortar leva o texto sem os hífens invisíveis.
  const copiar = (e: ClipboardEvent<HTMLTextAreaElement>, recortar: boolean) => {
    const area = e.currentTarget;
    const { selectionStart: ini, selectionEnd: fim } = area;
    if (ini === fim) return;
    e.preventDefault();
    e.clipboardData.setData("text/plain", semHifens(area.value.slice(ini, fim)));
    if (recortar && !disabled) {
      const a = indiceReal(area.value, ini);
      const b = indiceReal(area.value, fim);
      cursor.current = a;
      onChange(value.slice(0, a) + value.slice(b));
    }
  };

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
          value={exibido}
          onChange={mudar}
          onKeyDown={teclar}
          onCopy={(e) => copiar(e, false)}
          onCut={(e) => copiar(e, true)}
          onCompositionStart={(e) => {
            compondo.current = true;
            setTextoCompondo(e.currentTarget.value);
          }}
          onCompositionEnd={(e) => {
            compondo.current = false;
            const area = e.currentTarget;
            cursor.current = indiceReal(area.value, area.selectionStart);
            onChange(semHifens(area.value));
            setTextoCompondo(null);
          }}
          lang="pt-BR"
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
