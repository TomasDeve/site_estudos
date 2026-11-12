import { useLayoutEffect, useRef, useState, type ReactNode } from "react";
import { ChevronDown, ChevronUp, Sparkles } from "lucide-react";
import type { CorrecaoParagrafo, CorrecaoRedacao, UsoIA } from "@/api/paragrafos";
import { rotuloDoModelo } from "./modelos";
import {
  PARTES_REDACAO,
  TODAS_AS_PARTES,
  metaDasPartes,
  notaDaRedacao,
  type ParteRedacao,
  type TemaParagrafo,
  type TipoParagrafo,
} from "./paragrafos";

/** Texto com **negrito** (o formato dos fontes do PDF). */
export function Negrito({ texto }: { texto: string }) {
  const partes = texto.split(/\*\*(.+?)\*\*/g);
  return (
    <>
      {partes.map((p, i) => (i % 2 ? <strong key={i} className="font-semibold text-txt">{p}</strong> : p))}
    </>
  );
}

export function Secao({ titulo, children, className = "" }: { titulo: ReactNode; children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-card border border-line/50 bg-navy-800/80 px-4 py-4 shadow-card sm:px-5 ${className}`}>
      <h2 className="mb-3 text-[13px] font-bold uppercase tracking-wide text-dim">{titulo}</h2>
      {children}
    </section>
  );
}

/** A proposta como na prova: textos motivadores, tema e os 3 aspectos (o do parágrafo em destaque). */
export function Proposta({
  tema,
  tipo,
  aspecto,
  recolherTextos = false,
}: {
  tema: TemaParagrafo;
  tipo: TipoParagrafo;
  aspecto: number | null;
  recolherTextos?: boolean;
}) {
  const textos = (
    <div className="space-y-3">
      {tema.textos.map((t, i) => (
        <div key={i} className="border-l-2 border-line pl-3">
          <p className="text-[11px] font-bold uppercase tracking-wide text-mut">Texto {i + 1}</p>
          <p className="mt-1 text-sm leading-relaxed text-dim">{t.texto}</p>
          {t.fonte && <p className="mt-1 text-[11px] italic text-mut">{t.fonte}</p>}
        </div>
      ))}
    </div>
  );
  return (
    <Secao titulo={`Proposta · ${tema.bloco}`}>
      {recolherTextos ? (
        <details className="mb-4">
          <summary className="cursor-pointer text-xs font-semibold text-dim hover:text-txt">Textos motivadores</summary>
          <div className="mt-3">{textos}</div>
        </details>
      ) : (
        <div className="mb-4">{textos}</div>
      )}
      <p className="text-[15px] font-bold leading-snug text-txt">{tema.tema}</p>
      <p className="mt-2 text-xs text-mut">Ao elaborar seu texto, aborde os seguintes aspectos:</p>
      <ol className="mt-2 space-y-1.5">
        {tema.aspectos.map((a, i) => {
          const alvo = tipo === "introducao" || i === aspecto;
          return (
            <li
              key={i}
              className={`flex gap-2 rounded-lg px-2.5 py-1.5 text-sm leading-snug ${
                alvo ? "bg-gold/10 text-txt ring-1 ring-gold/40" : "text-mut"
              }`}
            >
              <span className={`font-bold tabular-nums ${alvo ? "text-gold" : ""}`}>{i + 1}</span>
              <span className="min-w-0 flex-1">
                {a.texto}
                <span className="ml-1.5 whitespace-nowrap text-[11px] text-mut">[valor: {a.valor} pontos]</span>
              </span>
            </li>
          );
        })}
      </ol>
    </Secao>
  );
}

const CHAVE_LEMBRETE = "redacao_lembrete_recolhido";

/**
 * O tema e os aspectos presos logo abaixo do cabeçalho enquanto escreve: aparece quando a
 * proposta sai do alto da tela. Fica pendurado no cabeçalho (absolute), então não empurra o
 * texto; o botão recolhe para uma linha só (lembra a escolha neste aparelho).
 */
export function LembreteProposta({ tema, tipo, aspecto }: { tema: TemaParagrafo; tipo: TipoParagrafo; aspecto: number | null }) {
  const ref = useRef<HTMLDivElement>(null);
  const [recolhido, setRecolhido] = useState(() => {
    try {
      return localStorage.getItem(CHAVE_LEMBRETE) === "1";
    } catch {
      return false;
    }
  });
  const alternar = () => {
    const novo = !recolhido;
    setRecolhido(novo);
    try {
      localStorage.setItem(CHAVE_LEMBRETE, novo ? "1" : "0");
    } catch {
      /* sem armazenamento: vale só nesta tela */
    }
  };

  // O que a página rola até a vista (o cursor, a resposta aberta) para abaixo da faixa, não por baixo dela.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const raiz = document.documentElement;
    const ajustar = () => {
      raiz.style.scrollPaddingTop = `${Math.ceil(el.getBoundingClientRect().bottom) + 8}px`;
    };
    ajustar();
    const obs = new ResizeObserver(ajustar);
    obs.observe(el);
    return () => {
      obs.disconnect();
      raiz.style.scrollPaddingTop = "";
    };
  }, []);

  return (
    <div ref={ref} className="absolute inset-x-0 top-full border-b border-line/50 bg-navy-900 shadow-card">
      <div className="mx-auto flex max-w-3xl items-start gap-2 px-3 py-2 sm:px-6">
        <div className="min-w-0 flex-1">
          <p className={`text-[13px] font-semibold leading-snug text-txt ${recolhido ? "truncate" : ""}`}>{tema.tema}</p>
          {!recolhido && (
            <ol className="mt-1 space-y-0.5">
              {tema.aspectos.map((a, i) => {
                const alvo = tipo === "introducao" || tipo === "redacao" || i === aspecto;
                return (
                  <li key={i} className={`flex gap-1.5 text-xs leading-snug ${alvo ? "text-dim" : "text-mut"}`}>
                    <span className={`font-bold tabular-nums ${alvo ? "text-gold" : ""}`}>{i + 1}</span>
                    <span className="min-w-0 flex-1">{a.texto}</span>
                  </li>
                );
              })}
            </ol>
          )}
        </div>
        <button
          onClick={alternar}
          aria-expanded={!recolhido}
          title={recolhido ? "Mostrar os aspectos" : "Recolher"}
          aria-label={recolhido ? "Mostrar os aspectos" : "Recolher o tema"}
          className="shrink-0 cursor-pointer rounded-lg p-1.5 text-mut transition-colors hover:bg-navy-700 hover:text-txt"
        >
          {recolhido ? <ChevronDown className="size-4" /> : <ChevronUp className="size-4" />}
        </button>
      </div>
    </div>
  );
}

const CONCEITOS = ["não abordou", "só mencionou", "desenvolveu de forma insuficiente", "desenvolveu articulado ao tema"];

export function corDaNota(n: number): string {
  return n >= 8 ? "text-green" : n >= 6 ? "text-gold" : "text-red";
}

/** Grifa no parágrafo os trechos que a IA marcou como erro. */
function TextoComErros({ texto, erros }: { texto: string; erros: CorrecaoParagrafo["erros"] }) {
  const marcas: { ini: number; fim: number }[] = [];
  for (const e of erros) {
    const ini = e.trecho ? texto.indexOf(e.trecho) : -1;
    if (ini >= 0 && !marcas.some((m) => ini < m.fim && ini + e.trecho.length > m.ini))
      marcas.push({ ini, fim: ini + e.trecho.length });
  }
  marcas.sort((a, b) => a.ini - b.ini);
  const partes: ReactNode[] = [];
  let pos = 0;
  marcas.forEach((m, i) => {
    partes.push(texto.slice(pos, m.ini));
    partes.push(
      <mark key={i} className="rounded-sm bg-red/20 px-0.5 text-txt underline decoration-red decoration-wavy underline-offset-4">
        {texto.slice(m.ini, m.fim)}
      </mark>
    );
    pos = m.fim;
  });
  partes.push(texto.slice(pos));
  return <p className="whitespace-pre-wrap text-sm leading-relaxed text-dim">{partes}</p>;
}

export function Correcao({
  correcao,
  texto,
  nota,
  notaConteudo,
  linhas,
  meta,
  segundos,
}: {
  correcao: CorrecaoParagrafo;
  texto: string;
  nota: number;
  notaConteudo: number;
  linhas: number;
  meta: [number, number];
  segundos: number | null;
}) {
  const ne = correcao.erros.length;
  return (
    <div className="space-y-4">
      <Secao titulo="Nota">
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <span className={`text-5xl font-extrabold tabular-nums ${corDaNota(nota)}`}>
              {nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}
            </span>
            <span className="ml-1 text-sm text-mut">de 10</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs sm:grid-cols-4">
            <Dado rotulo="Conceito" valor={`${correcao.conceito} de 3`} />
            <Dado rotulo="Conteúdo" valor={notaConteudo.toLocaleString("pt-BR", { maximumFractionDigits: 2 })} />
            <Dado rotulo="Erros" valor={String(ne)} />
            <Dado
              rotulo="Linhas"
              valor={`${linhas} (meta ${meta[0]}–${meta[1]})`}
              alerta={linhas < meta[0] || linhas > meta[1]}
            />
            {segundos != null && <Dado rotulo="Tempo" valor={fmtTempo(segundos)} />}
          </dl>
        </div>
        <p className="mt-2 text-xs text-mut">
          Conceito {correcao.conceito}: {CONCEITOS[correcao.conceito]}. Como no quesito da banca, o conceito dá o
          conteúdo (3 = 10; 2 ≈ 6,7; 1 ≈ 3,3), e a nota = conteúdo − 2 × erros ÷ linhas (a conta da Cebraspe, em
          escala 10).
        </p>
        <p className="mt-3 text-sm leading-relaxed text-txt">{correcao.veredito}</p>
        {correcao.uso && (
          <p className="mt-3 border-t border-line/40 pt-2 text-[11px] text-mut">
            Gasto desta correção ({rotuloDoModelo(correcao.uso.modelo)}): <GastoIA uso={correcao.uso} />
          </p>
        )}
      </Secao>

      <Secao titulo="O que pesou no conceito">
        <ul className="divide-y divide-line/40">
          {correcao.criterios.map((c, i) => (
            <li key={i} className="py-2 first:pt-0 last:pb-0">
              <div className="flex items-baseline justify-between gap-3">
                <span className="text-sm font-semibold text-txt">{c.nome}</span>
                <SituacaoCriterio criterio={c} />
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-dim">{c.comentario}</p>
            </li>
          ))}
        </ul>
      </Secao>

      <div className="grid gap-4 sm:grid-cols-2">
        <Secao titulo="O que funcionou">
          <Lista itens={correcao.acertos} cor="text-green" vazio="Nada que se destaque ainda." />
        </Secao>
        <Secao titulo="O que melhorar">
          <Lista itens={correcao.melhorar} cor="text-gold" vazio="Nada a melhorar." />
        </Secao>
      </div>

      <Secao titulo={`Seu parágrafo${ne ? ` · ${ne} ${ne === 1 ? "erro" : "erros"} de português` : ""}`}>
        <TextoComErros texto={texto} erros={correcao.erros} />
        {ne > 0 && (
          <ul className="mt-4 space-y-2 border-t border-line/40 pt-3">
            {correcao.erros.map((e, i) => (
              <li key={i} className="text-sm leading-snug">
                <span className="text-red line-through decoration-red/70">{e.trecho}</span>
                <span className="mx-1.5 text-mut">→</span>
                <span className="font-semibold text-green">{e.correcao}</span>
                <p className="mt-0.5 text-xs text-mut">{e.explicacao}</p>
              </li>
            ))}
          </ul>
        )}
      </Secao>

      <Secao
        titulo={
          <span className="inline-flex items-center gap-1.5">
            <Sparkles className="size-3.5 text-gold" /> Seu parágrafo nota máxima
          </span>
        }
        className="ring-1 ring-gold/30"
      >
        <p className="whitespace-pre-wrap text-[15px] leading-relaxed text-txt">{correcao.reescrita}</p>
      </Secao>
    </div>
  );
}

const COR_CONCEITO = ["bg-red/15 text-red", "bg-red/15 text-red", "bg-amber/15 text-amber", "bg-green/15 text-green"];
const PONTOS_ESTRUTURA = { ok: 1.5, parcial: 0.75, faltou: 0 } as const;
const fmtPontos = (n: number) => n.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

/**
 * Correção da redação: conceito de cada aspecto e da estrutura, erros e a nota da Cebraspe.
 * Se ele escreveu só alguns parágrafos, a nota é sobre o que dava para tirar com eles.
 */
export function CorrecaoDaRedacao({
  correcao,
  texto,
  linhas,
  segundos,
  aspectos,
  partes = TODAS_AS_PARTES,
}: {
  correcao: CorrecaoRedacao;
  texto: string;
  linhas: number;
  segundos: number | null;
  /** Texto e valor de cada aspecto da proposta. */
  aspectos: { texto: string; valor: number }[];
  /** Os parágrafos que ele escreveu. */
  partes?: ParteRedacao[];
}) {
  const ne = correcao.erros.length;
  const porAspecto = [correcao.aspecto1, correcao.aspecto2, correcao.aspecto3];
  const estrutura = correcao.estrutura;
  const completa = partes.length === TODAS_AS_PARTES.length;
  const escrito = (i: number) => PARTES_REDACAO.some((p) => p.aspecto === i && partes.includes(p.id));
  const r = notaDaRedacao(
    porAspecto.map((a) => a.conceito),
    aspectos.map((a) => a.valor),
    estrutura.situacao,
    ne,
    linhas,
    partes
  );
  const meta = metaDasPartes(partes);
  return (
    <div className="space-y-4">
      <Secao titulo={completa ? "Nota da redação" : "Nota dos parágrafos escritos"}>
        <div className="flex flex-wrap items-end gap-x-6 gap-y-3">
          <div>
            <span className={`text-5xl font-extrabold tabular-nums ${corDaNota((r.nota30 || 0) / 3)}`}>
              {r.nota.toLocaleString("pt-BR", { minimumFractionDigits: 1, maximumFractionDigits: 2 })}
            </span>
            <span className="ml-1 text-sm text-mut">de {completa ? "30" : fmtPontos(r.maximo)}</span>
          </div>
          <dl className="grid grid-cols-2 gap-x-5 gap-y-1 text-xs sm:grid-cols-4">
            <Dado rotulo="Conteúdo (NC)" valor={fmtPontos(r.notaConteudo)} />
            <Dado rotulo="Erros (NE)" valor={String(ne)} />
            <Dado rotulo="Linhas (TL)" valor={`${linhas} (meta ${meta[0]}–${meta[1]})`} alerta={linhas > 30 || linhas < meta[0] - 3} />
            {segundos != null && <Dado rotulo="Tempo" valor={fmtTempo(segundos)} />}
          </dl>
        </div>
        {!completa && (
          <p className="mt-2 text-sm text-dim">
            Você escreveu {partes.length} de 4 parágrafos. Na escala da prova, equivale a{" "}
            <strong className={`font-bold ${corDaNota(r.nota30 / 3)}`}>
              {r.nota30.toLocaleString("pt-BR", { maximumFractionDigits: 1 })} de 30
            </strong>
            .
          </p>
        )}
        <p className="mt-2 text-xs text-mut">
          Como a Cebraspe: cada aspecto vale conceito ÷ 3 × o valor dele, a estrutura vale até 1,50, e a nota = NC − 6 ×
          erros ÷ linhas. Aprova com 15 de 30.{linhas > 30 && " O que passa da linha 30 a banca não lê."}
        </p>
        <p className="mt-3 text-sm leading-relaxed text-txt">{correcao.veredito}</p>
        {correcao.uso && (
          <p className="mt-3 border-t border-line/40 pt-2 text-[11px] text-mut">
            Gasto desta correção ({rotuloDoModelo(correcao.uso.modelo)}): <GastoIA uso={correcao.uso} />
          </p>
        )}
      </Secao>

      <Secao titulo="Os 3 aspectos e a estrutura">
        <ul className="divide-y divide-line/40">
          {porAspecto.map((a, i) =>
            !escrito(i) ? (
              <li key={i} className="py-2.5 opacity-60 first:pt-0">
                <span className="text-sm text-mut">
                  <span className="font-bold">{i + 1}</span> {aspectos[i]?.texto}
                </span>
                <p className="mt-0.5 text-xs text-mut">Parágrafo não escrito neste treino: não entra na nota.</p>
              </li>
            ) : (
            <li key={i} className="py-2.5 first:pt-0">
              <div className="flex items-start justify-between gap-3">
                <span className="text-sm text-txt">
                  <span className="font-bold text-gold">{i + 1}</span> {aspectos[i]?.texto}
                </span>
                <span className="flex shrink-0 flex-col items-end gap-0.5">
                  <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${COR_CONCEITO[a.conceito]}`}>
                    conceito {a.conceito} de 3
                  </span>
                  <span className="text-[11px] tabular-nums text-mut">
                    {fmtPontos((a.conceito * (aspectos[i]?.valor ?? 0)) / 3)} de {fmtPontos(aspectos[i]?.valor ?? 0)}
                  </span>
                </span>
              </div>
              <p className="mt-0.5 text-xs leading-relaxed text-dim">{a.comentario}</p>
            </li>
            )
          )}
          <li className="pt-2.5">
            <div className="flex items-start justify-between gap-3">
              <span className="text-sm font-semibold text-txt">Apresentação e estrutura</span>
              <span className="flex shrink-0 flex-col items-end gap-0.5">
                <span className={`rounded-full px-2 py-0.5 text-[11px] font-bold ${SITUACOES[estrutura.situacao].cor}`}>
                  {SITUACOES[estrutura.situacao].rotulo}
                </span>
                <span className="text-[11px] tabular-nums text-mut">
                  {completa ? `${fmtPontos(PONTOS_ESTRUTURA[estrutura.situacao])} de 1,50` : "só conta com os 4"}
                </span>
              </span>
            </div>
            <p className="mt-0.5 text-xs leading-relaxed text-dim">{estrutura.comentario}</p>
          </li>
        </ul>
      </Secao>

      <div className="grid gap-4 sm:grid-cols-2">
        <Secao titulo="O que funcionou">
          <Lista itens={correcao.acertos} cor="text-green" vazio="Nada que se destaque ainda." />
        </Secao>
        <Secao titulo="O que melhorar">
          <Lista itens={correcao.melhorar} cor="text-gold" vazio="Nada a melhorar." />
        </Secao>
      </div>

      <Secao titulo={`Sua redação${ne ? ` · ${ne} ${ne === 1 ? "erro" : "erros"} de português` : ""}`}>
        <TextoComErros texto={texto} erros={correcao.erros} />
        {ne > 0 && (
          <ul className="mt-4 space-y-2 border-t border-line/40 pt-3">
            {correcao.erros.map((e, i) => (
              <li key={i} className="text-sm leading-snug">
                <span className="text-red line-through decoration-red/70">{e.trecho}</span>
                <span className="mx-1.5 text-mut">→</span>
                <span className="font-semibold text-green">{e.correcao}</span>
                <p className="mt-0.5 text-xs text-mut">{e.explicacao}</p>
              </li>
            ))}
          </ul>
        )}
      </Secao>
    </div>
  );
}

const SITUACOES = {
  ok: { rotulo: "ok", cor: "bg-green/15 text-green" },
  parcial: { rotulo: "parcial", cor: "bg-amber/15 text-amber" },
  faltou: { rotulo: "faltou", cor: "bg-red/15 text-red" },
} as const;

/** Situação do critério; correções antigas (com pontos) viram ok/parcial/faltou pela proporção. */
function SituacaoCriterio({ criterio }: { criterio: CorrecaoParagrafo["criterios"][number] }) {
  let s = criterio.situacao;
  if (!s && criterio.max) {
    const r = (criterio.pontos ?? 0) / criterio.max;
    s = r >= 0.99 ? "ok" : r > 0 ? "parcial" : "faltou";
  }
  if (!s) return null;
  return (
    <span className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${SITUACOES[s].cor}`}>
      {SITUACOES[s].rotulo}
    </span>
  );
}

function Dado({ rotulo, valor, alerta = false }: { rotulo: string; valor: string; alerta?: boolean }) {
  return (
    <div>
      <dt className="text-[10px] font-semibold uppercase tracking-wide text-mut">{rotulo}</dt>
      <dd className={`font-semibold tabular-nums ${alerta ? "text-amber" : "text-txt"}`}>{valor}</dd>
    </div>
  );
}

function Lista({ itens, cor, vazio }: { itens: string[]; cor: string; vazio: string }) {
  if (!itens.length) return <p className="text-sm text-mut">{vazio}</p>;
  return (
    <ul className="space-y-2">
      {itens.map((t, i) => (
        <li key={i} className="flex gap-2 text-sm leading-snug text-dim">
          <span className={`mt-1.5 size-1.5 shrink-0 rounded-full bg-current ${cor}`} />
          <span>{t}</span>
        </li>
      ))}
    </ul>
  );
}

export function fmtUSD(v: number): string {
  return `US$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: v < 0.1 ? 3 : 2, maximumFractionDigits: v < 0.1 ? 3 : 2 })}`;
}

export function fmtTokens(n: number): string {
  return n >= 10_000 ? `${(n / 1000).toLocaleString("pt-BR", { maximumFractionDigits: 0 })} mil` : n.toLocaleString("pt-BR");
}

/** "3.120 tokens de entrada + 2.850 de saída ≈ US$ 0,069" */
export function GastoIA({ uso }: { uso: Pick<UsoIA, "entrada" | "saida" | "custo_usd"> }) {
  return (
    <span className="tabular-nums">
      {fmtTokens(uso.entrada)} tokens de entrada + {fmtTokens(uso.saida)} de saída ≈{" "}
      <strong className="font-semibold text-dim">{fmtUSD(uso.custo_usd)}</strong>
    </span>
  );
}

export function fmtTempo(seg: number): string {
  const m = Math.floor(seg / 60);
  const s = seg % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}
