import { useId, type ReactNode } from "react";
import { BadgeCheck, BarChart3, BookOpenCheck, Info, Lightbulb, MapPin, Quote, Scale, Shapes, type LucideIcon } from "lucide-react";
import { CORINGAS, ROTULO_TIPO, tipoDoAspecto } from "./coringas";
import { lerInformacao, maiuscula, type Informacao, type TipoInformacao } from "./informacao";
import {
  aberturaDoParagrafo,
  embasamentoDoParagrafo,
  modeloDoParagrafo,
  pontosDoParagrafo,
  type TemaParagrafo,
  type TipoParagrafo,
} from "./paragrafos";
import { Negrito } from "./partes";

// Cada tipo de informação com cor e ícone próprios: o olho acha na hora o dado, a lei e o caso.
const ESTILO: Record<TipoInformacao, { nome: string; Icone: LucideIcon; cor: string; fundo: string; borda: string }> = {
  dado: { nome: "Dado", Icone: BarChart3, cor: "text-blue", fundo: "bg-blue/12", borda: "border-blue/45" },
  lei: { nome: "Lei / decisão", Icone: Scale, cor: "text-gold", fundo: "bg-gold/12", borda: "border-gold/45" },
  caso: { nome: "Caso / exemplo", Icone: MapPin, cor: "text-green", fundo: "bg-green/12", borda: "border-green/45" },
  frase: { nome: "Frase pronta", Icone: Quote, cor: "text-cyan", fundo: "bg-cyan/12", borda: "border-cyan/45" },
  info: { nome: "Essencial", Icone: Info, cor: "text-dim", fundo: "bg-navy-700/60", borda: "border-line" },
};

function Selo({ tipo }: { tipo: TipoInformacao }) {
  const { nome, Icone, cor, fundo } = ESTILO[tipo];
  return (
    <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide ${cor} ${fundo}`}>
      <Icone className="size-3" aria-hidden />
      {nome}
    </span>
  );
}

/** Uma informação: selo do tipo, rótulo em destaque, texto e fonte em letra menor. */
function Prova({ info }: { info: Informacao }) {
  return (
    <div className={`rounded-lg border-l-[3px] bg-navy-900/50 py-2 pl-3 pr-2.5 ${ESTILO[info.tipo].borda}`}>
      <Selo tipo={info.tipo} />
      {info.rotulo && <p className="mt-1.5 text-[13px] font-bold leading-snug text-txt">{info.rotulo}</p>}
      <p className={`text-[13px] leading-relaxed text-dim ${info.rotulo ? "mt-0.5" : "mt-1.5"}`}>
        <Negrito texto={info.texto} />
      </p>
      {info.fonte && <p className="mt-1 text-[11px] text-mut">Fonte: {info.fonte}</p>}
    </div>
  );
}

/** Título de bloco numerado, como os títulos grandes de um resumo bem organizado. */
function Bloco({
  id,
  numero,
  titulo,
  dica,
  Icone,
  cor,
  children,
}: {
  id: string;
  numero: number;
  titulo: string;
  dica?: string;
  Icone: LucideIcon;
  cor: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="scroll-mt-20 rounded-card border border-line/50 bg-navy-800/80 px-4 py-4 shadow-card sm:px-5">
      <div className="mb-3 flex items-center gap-2.5">
        <span className={`flex size-7 shrink-0 items-center justify-center rounded-full bg-navy-900 text-sm font-extrabold ring-1 ring-line ${cor}`}>
          {numero}
        </span>
        <Icone className={`size-4 shrink-0 ${cor}`} aria-hidden />
        <div className="min-w-0">
          <h3 className="text-[15px] font-bold leading-tight text-txt">{titulo}</h3>
          {dica && <p className="text-[11px] text-mut">{dica}</p>}
        </div>
      </div>
      {children}
    </section>
  );
}

/**
 * O repertório daquele parágrafo, organizado para bater o olho: atalhos no topo, pontos em
 * cartões com a prova separada por tipo (dado, lei, caso), "Para decorar" e coringas em grade,
 * e o parágrafo modelo por último.
 */
export function Repertorio({ tema, tipo, aspecto }: { tema: TemaParagrafo; tipo: TipoParagrafo; aspecto: number | null }) {
  const base = useId();
  const pontos = pontosDoParagrafo(tema, tipo, aspecto);
  const provas = embasamentoDoParagrafo(tema, tipo, aspecto);
  const tipoAsp = tipo === "introducao" ? "cenario" : tipoDoAspecto(tema.aspectos[aspecto ?? 0].texto);
  const coringas = CORINGAS.filter((c) => c.frases[tipoAsp]);
  const e = tema.esqueleto;
  const decorar = tema.decorar.map((d) =>
    lerInformacao(d.texto || d.titulo, { rotulo: d.texto ? d.titulo : undefined, tipoDado: d.tipo === "essencial" ? undefined : d.tipo })
  );

  const blocos = [
    { id: `${base}-pontos`, nome: tipo === "introducao" ? "Fatos para abrir" : "Pontos" },
    ...(decorar.length ? [{ id: `${base}-decorar`, nome: "Para decorar" }] : []),
    { id: `${base}-coringas`, nome: "Coringas" },
    { id: `${base}-modelo`, nome: "Modelo" },
  ];
  const numero = (id: string) => blocos.findIndex((b) => b.id === id) + 1;
  const ir = (id: string) => document.getElementById(id)?.scrollIntoView({ behavior: "smooth", block: "start" });

  return (
    <div className="space-y-4">
      <div className="pt-2">
        <div className="flex items-center gap-2">
          <Lightbulb className="size-5 text-gold" aria-hidden />
          <h2 className="text-lg font-bold text-txt">Repertório para este parágrafo</h2>
        </div>
        {tipo !== "introducao" && (
          <p className="mt-1 text-xs text-dim">
            Aspecto {(aspecto ?? 0) + 1} · <span className="text-txt">{tema.aspectos[aspecto ?? 0].texto}</span> ·{" "}
            <span className="text-gold">{ROTULO_TIPO[tipoAsp]}</span>
          </p>
        )}
        {/* atalhos: pular direto para o bloco */}
        <nav className="mt-3 flex flex-wrap gap-1.5" aria-label="Atalhos do repertório">
          {blocos.map((b, i) => (
            <button
              key={b.id}
              onClick={() => ir(b.id)}
              className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-line/60 bg-navy-800/80 px-3 py-1 text-xs font-semibold text-dim transition-colors hover:border-gold/50 hover:text-txt"
            >
              <span className="tabular-nums text-gold">{i + 1}</span>
              {b.nome}
            </button>
          ))}
        </nav>
        {/* legenda das cores */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {(["dado", "lei", "caso"] as const).map((t) => (
            <Selo key={t} tipo={t} />
          ))}
        </div>
      </div>

      <Bloco
        id={`${base}-pontos`}
        numero={numero(`${base}-pontos`)}
        titulo={tipo === "introducao" ? "Fatos para abrir a introdução" : `Pontos para o aspecto ${(aspecto ?? 0) + 1}`}
        dica={tipo === "introducao" ? "Escolha um fato e anuncie os 3 aspectos" : "Escolha 2 pontos; a prova de cada um vem embaixo"}
        Icone={BookOpenCheck}
        cor="text-gold"
      >
        <ol className="space-y-3">
          {pontos.map((p, i) => (
            <li key={i} className="rounded-xl border border-line/50 bg-navy-900/40 p-3">
              <div className="flex gap-2.5">
                <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-gold/15 text-xs font-extrabold text-gold">
                  {i + 1}
                </span>
                <p className="min-w-0 pt-0.5 text-[15px] font-semibold leading-snug text-txt">
                  <Negrito texto={p} />
                </p>
              </div>
              {provas[i] && (
                <div className="mt-2.5 sm:pl-8">
                  <Prova info={lerInformacao(provas[i])} />
                </div>
              )}
            </li>
          ))}
        </ol>
        {tipo === "introducao" && (
          <div className="mt-3 space-y-3">
            <div className="rounded-xl border border-line/50 bg-navy-900/40 p-3">
              <p className="text-[11px] font-bold uppercase tracking-wide text-gold">Anúncio dos aspectos</p>
              <p className="mt-1 text-sm leading-relaxed text-dim">
                Nesse sentido, vale citar <strong className="text-txt">{e.anuncia[0]}</strong>, expor{" "}
                <strong className="text-txt">{e.anuncia[1]}</strong> e <strong className="text-txt">{e.anuncia[2]}</strong>.
              </p>
            </div>
            {e.pronta && (
              <div className="rounded-xl border border-line/50 bg-navy-900/40 p-3">
                <p className="text-[11px] font-bold uppercase tracking-wide text-gold">Introdução pronta (do PDF)</p>
                <p className="mt-1 text-sm italic leading-relaxed text-dim">{e.pronta}</p>
              </div>
            )}
          </div>
        )}
      </Bloco>

      {decorar.length > 0 && (
        <Bloco
          id={`${base}-decorar`}
          numero={numero(`${base}-decorar`)}
          titulo="Para decorar deste tema"
          dica="Números, leis e exemplos do tema"
          Icone={Shapes}
          cor="text-blue"
        >
          <div className="grid gap-2.5 sm:grid-cols-2">
            {decorar.map((info, i) => (
              <Prova key={i} info={info} />
            ))}
          </div>
        </Bloco>
      )}

      <Bloco
        id={`${base}-coringas`}
        numero={numero(`${base}-coringas`)}
        titulo={`Coringas · ${ROTULO_TIPO[tipoAsp]}`}
        dica="Servem em quase todo tema: 2 coringas diferentes = 2 pontos"
        Icone={Shapes}
        cor="text-cyan"
      >
        <div className="grid gap-2.5 sm:grid-cols-2">
          {coringas.map((c) => (
            <div key={c.nome} className="rounded-lg border-l-[3px] border-cyan/45 bg-navy-900/50 py-2 pl-3 pr-2.5">
              <span className="inline-flex rounded-full bg-cyan/12 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-cyan">
                {c.nome}
              </span>
              <p className="mt-1.5 text-[13px] leading-relaxed text-txt">{maiuscula(c.frases[tipoAsp] ?? "")}.</p>
              <p className="mt-1 text-[11px] text-mut">Base: {c.base}</p>
            </div>
          ))}
        </div>
      </Bloco>

      <p className="text-center text-xs text-mut">Abertura do esqueleto: {aberturaDoParagrafo(tipo, aspecto)}</p>

      {/* o modelo fica por último: primeiro o repertório, depois a resposta pronta */}
      <Bloco
        id={`${base}-modelo`}
        numero={numero(`${base}-modelo`)}
        titulo="Parágrafo modelo · nota máxima"
        dica="Leia depois de tentar sozinho"
        Icone={BadgeCheck}
        cor="text-green"
      >
        <p className="whitespace-pre-wrap rounded-xl border border-green/30 bg-navy-900/40 p-3 text-[15px] leading-relaxed text-txt">
          {modeloDoParagrafo(tema, tipo, aspecto)}
        </p>
        <p className="mt-2 text-[11px] leading-relaxed text-mut">
          Escrito no seu esqueleto, pelos critérios da Cebraspe: responde ao aspecto com as palavras do enunciado,
          desenvolve 2 pontos com informação concreta e fecha ligando ao tema. Não é o único jeito certo: outra abordagem
          bem desenvolvida também tira nota máxima.
        </p>
      </Bloco>
    </div>
  );
}
