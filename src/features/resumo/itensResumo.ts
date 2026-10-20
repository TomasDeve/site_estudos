import type { Concurso, ConcursoMateria, Materia, QuestaoTipo, Topico } from "@/types/db";
import type { MarcaAnki } from "@/api/questoesAnki";
import type { QuestaoDoResumo } from "@/api/topicoQuestoes";
import { parseFonteQC } from "@/features/conteudos/fonteQuestao";
import { acertou, estaResolvida } from "@/features/conteudos/questaoModelo";

/**
 * Onde cada questão do "Adicionar ao resumo" está em relação ao Anki — a cor do
 * quadradinho no celular do resumo:
 *   falta     ainda não virou card (e cai no edital do concurso ativo);
 *   no_anki   já virou card (importação, achada no Anki ou marcada à mão);
 *   ignorada  você decidiu que não vai para o Anki;
 *   fora      fora do edital do concurso ativo (a importação não leva sem você pedir);
 *   apagada   o trecho ficou no resumo, mas a questão sumiu do site.
 */
export type EstadoAnki = "falta" | "no_anki" | "ignorada" | "fora" | "apagada";

/** Trecho de uma questão no "Resumo das questões": `<div data-resumo-questao="ID">…</div>`. */
export interface BlocoResumo {
  questaoId: string;
  /** Miolo do wrapper (começa com o `<hr>` separador). */
  html: string;
}

/**
 * Os trechos marcados de um resumo, com as divs aninhadas balanceadas — o mesmo
 * recorte do script da importação (`site-anki.mjs` → `extrairBlocos`), sem DOM, para
 * rodar também nos testes. Continua a busca por dentro de cada trecho, como o
 * `querySelectorAll` do `idsNoResumo`: um wrapper que o editor tenha aninhado também conta.
 */
export function extrairBlocos(html: string): BlocoResumo[] {
  const out: BlocoResumo[] = [];
  const re = /<div\s+data-resumo-questao="([^"]+)"[^>]*>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const ini = m.index + m[0].length;
    const tag = /<(\/?)div\b[^>]*>/gi;
    tag.lastIndex = ini;
    let profundidade = 1;
    let fim = html.length;
    let t: RegExpExecArray | null;
    while ((t = tag.exec(html))) {
      profundidade += t[1] ? -1 : 1;
      if (profundidade === 0) {
        fim = t.index;
        break;
      }
    }
    out.push({ questaoId: m[1], html: html.slice(ini, fim) });
  }
  return out;
}

/** HTML de um trecho em texto puro, uma linha por bloco (mesma ideia do `htmlParaTexto` da skill). */
export function htmlParaTexto(html: string): string {
  return html
    .replace(/<hr\s*\/?>/gi, "\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "\n• ")
    .replace(/<\/(div|p|li|ul|ol|h\d|tr)>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .split("\n")
    .map((l) => l.trim())
    .join("\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** Tira o `<hr>` que abre o trecho: ele separa um bloco do outro, não é conteúdo. */
export function corpoDoTrecho(html: string): string {
  return html.replace(/^\s*<hr\s*\/?>/i, "");
}

const LIMITE_RECORTE = 220;

function cortar(s: string): string {
  const uma = s.replace(/\s+/g, " ").trim();
  return uma.length > LIMITE_RECORTE ? `${uma.slice(0, LIMITE_RECORTE - 1)}…` : uma;
}

/**
 * O texto do quadradinho: o enunciado da questão. Sem a questão (apagada do site),
 * o começo do próprio trecho, pulando a linha do cabeçalho "Q… · ano (BANCA)".
 */
export function recorteDaQuestao(enunciado: string | null | undefined, htmlTrecho: string): string {
  if (enunciado?.trim()) return cortar(enunciado);
  const linhas = htmlParaTexto(htmlTrecho)
    .split("\n")
    .filter((l) => l && !/^Q\d{4,}\b/.test(l));
  return cortar(linhas.join(" ")) || "Trecho vazio";
}

/**
 * Diz se um assunto cai no edital de algum concurso ATIVO — a mesma regra da
 * importação (`site-anki.mjs` → `edital`) e da função `resumo_anki_faltam` do banco:
 * matéria vinculada e não riscada, assunto no recorte (`topicos_incluidos`) e não
 * riscado. Sem concurso ativo, tudo conta como dentro.
 */
export function criarFiltroEdital(
  concursos: Pick<Concurso, "id" | "status">[],
  vinculos: Pick<ConcursoMateria, "concurso_id" | "materia_id" | "riscada" | "topicos_incluidos" | "topicos_riscados">[],
  topicoPorId: ReadonlyMap<string, Pick<Topico, "id" | "materia_id">>
): (topicoId: string | null | undefined) => boolean {
  const ativos = new Set(concursos.filter((c) => c.status === "ativo").map((c) => c.id));
  if (ativos.size === 0) return () => true;
  const doAtivo = vinculos.filter((v) => ativos.has(v.concurso_id));
  return (topicoId) => {
    const t = topicoId ? topicoPorId.get(topicoId) : undefined;
    if (!t) return false;
    return doAtivo.some(
      (v) =>
        v.materia_id === t.materia_id &&
        !v.riscada &&
        (!v.topicos_incluidos || v.topicos_incluidos.includes(t.id)) &&
        !(v.topicos_riscados ?? []).includes(t.id)
    );
  };
}

/** A cor da questão. A marca (no Anki / ignorada) vale mesmo fora do edital. */
export function estadoDaQuestao(
  existe: boolean,
  marca: Pick<MarcaAnki, "status"> | null | undefined,
  noEdital: boolean
): EstadoAnki {
  if (!existe) return "apagada";
  if (marca?.status === "no_anki") return "no_anki";
  if (marca?.status === "ignorada") return "ignorada";
  return noEdital ? "falta" : "fora";
}

/** Um resumo de questões (linha de `topico_textos`) como o celular precisa. */
export interface ResumoDeQuestoes {
  id: string;
  conteudo: string;
  topico_id: string | null;
  materia_id: string | null;
}

/** Uma questão no celular do resumo — um quadradinho. */
export interface ItemResumo {
  questaoId: string;
  /** Texto (topico_textos) onde o trecho mora — o "Editar trecho" grava nele. */
  resumoId: string;
  /** Destino do resumo (o mesmo do "Adicionar ao resumo"), para achar o editor aberto. */
  destino: { topicoId?: string; materiaId?: string };
  /** Assunto da questão (ou, sem ela, o do resumo). */
  topicoId: string | null;
  materiaId: string | null;
  /** HTML do trecho, sem o `<hr>` do começo; questão repetida em dois trechos → os dois. */
  html: string;
  recorte: string;
  /** "Q3213956" — null quando a fonte não é do QConcursos. */
  codigo: string | null;
  banca: string | null;
  ano: string | null;
  tipo: QuestaoTipo | null;
  /** true = acertou, false = errou, null = sem resposta (ou sem questão). */
  acertou: boolean | null;
  estado: EstadoAnki;
  marca: MarcaAnki | null;
  /** Ordem em que o trecho aparece nos resumos — desempate dentro do assunto. */
  ordem: number;
}

/**
 * Junta os trechos dos resumos com as questões e as marcas do Anki: um item por
 * questão (a mesma questão em dois trechos vira um item só, com os dois trechos).
 */
export function montarItens({
  resumos,
  questoes,
  marcas,
  topicoPorId,
  noEdital,
  questoesChegando = false,
}: {
  resumos: readonly ResumoDeQuestoes[];
  questoes: ReadonlyMap<string, QuestaoDoResumo>;
  marcas: ReadonlyMap<string, MarcaAnki>;
  topicoPorId: ReadonlyMap<string, Pick<Topico, "id" | "materia_id">>;
  noEdital: (topicoId: string | null | undefined) => boolean;
  /**
   * As questões de um trecho que acabou de entrar ainda estão chegando: até lá, o
   * trecho sem questão conta como existente (não pisca "apagada").
   */
  questoesChegando?: boolean;
}): ItemResumo[] {
  const porId = new Map<string, ItemResumo>();
  let ordem = 0;
  for (const r of resumos) {
    for (const b of extrairBlocos(r.conteudo ?? "")) {
      const corpo = corpoDoTrecho(b.html);
      const ja = porId.get(b.questaoId);
      if (ja) {
        ja.html += `<hr>${corpo}`;
        continue;
      }
      const q = questoes.get(b.questaoId);
      const topicoId = q?.topico_id ?? r.topico_id;
      const materiaId = (topicoId ? topicoPorId.get(topicoId)?.materia_id : undefined) ?? r.materia_id;
      const fonte = q?.fonte ? parseFonteQC(q.fonte) : null;
      const marca = marcas.get(b.questaoId) ?? null;
      porId.set(b.questaoId, {
        questaoId: b.questaoId,
        resumoId: r.id,
        destino: r.topico_id ? { topicoId: r.topico_id } : { materiaId: r.materia_id ?? undefined },
        topicoId: topicoId ?? null,
        materiaId: materiaId ?? null,
        html: corpo,
        recorte: recorteDaQuestao(q?.enunciado, b.html),
        codigo: fonte?.codigo ?? null,
        banca: fonte?.banca ?? null,
        ano: fonte?.ano ?? null,
        tipo: q ? (q.tipo === "multipla" ? "multipla" : "ce") : null,
        acertou: q && estaResolvida(q) ? acertou(q) : null,
        estado: estadoDaQuestao(!!q || questoesChegando, marca, noEdital(topicoId)),
        marca,
        ordem: ordem++,
      });
    }
  }
  return [...porId.values()];
}

export interface Contagem {
  total: number;
  falta: number;
  no_anki: number;
  ignorada: number;
  fora: number;
  apagada: number;
}

export function contar(itens: readonly Pick<ItemResumo, "estado">[]): Contagem {
  const c: Contagem = { total: 0, falta: 0, no_anki: 0, ignorada: 0, fora: 0, apagada: 0 };
  for (const it of itens) {
    c.total++;
    c[it.estado]++;
  }
  return c;
}

/**
 * A "bateria" do celular: quanto do que importa já está no Anki — no Anki ÷ (no Anki
 * + falta). Ignoradas, fora do edital e apagadas não entram na conta.
 */
export function cargaDaBateria(c: Pick<Contagem, "falta" | "no_anki">): number {
  const base = c.falta + c.no_anki;
  return base === 0 ? 100 : Math.round((c.no_anki / base) * 100);
}

export type FiltroCelular = "todas" | "falta" | "no_anki";

export function passaNoFiltro(estado: EstadoAnki, filtro: FiltroCelular): boolean {
  return filtro === "todas" || estado === filtro;
}

/** Uma matéria do celular — um "app" na tela inicial. */
export interface AppMateria {
  materiaId: string;
  nome: string;
  icone: string;
  itens: ItemResumo[];
  contagem: Contagem;
}

/**
 * Os apps da tela inicial: uma matéria por app, na ordem do edital (`ordem` = ids
 * das matérias do concurso em estudo); as que não são do concurso vêm depois, por nome.
 */
export function appsPorMateria(
  itens: readonly ItemResumo[],
  materiaPorId: ReadonlyMap<string, Pick<Materia, "id" | "nome" | "icone">>,
  ordem: readonly string[]
): AppMateria[] {
  const grupos = new Map<string, ItemResumo[]>();
  for (const it of itens) {
    const chave = it.materiaId ?? "";
    const arr = grupos.get(chave) ?? [];
    arr.push(it);
    grupos.set(chave, arr);
  }
  const pos = new Map(ordem.map((id, i) => [id, i]));
  return [...grupos.entries()]
    .map(([materiaId, lista]) => {
      const m = materiaPorId.get(materiaId);
      return {
        materiaId,
        nome: m?.nome ?? "Sem matéria",
        icone: m?.icone ?? "📄",
        itens: lista,
        contagem: contar(lista),
      };
    })
    .sort(
      (a, b) =>
        (pos.get(a.materiaId) ?? 1e9) - (pos.get(b.materiaId) ?? 1e9) || a.nome.localeCompare(b.nome)
    );
}

/** Um assunto dentro do app — o título da seção e os quadradinhos dele. */
export interface SecaoAssunto {
  chave: string;
  topicoId: string | null;
  materiaId: string | null;
  titulo: string;
  itens: ItemResumo[];
}

/**
 * Os quadradinhos agrupados por assunto. As seções seguem as matérias na ordem dos
 * apps e, dentro de cada uma, a ordem do edital (`rankTopico`, menor primeiro); os
 * quadradinhos, a ordem em que entraram no resumo.
 */
export function secoesPorAssunto(
  itens: readonly ItemResumo[],
  topicoPorId: ReadonlyMap<string, Pick<Topico, "id" | "titulo" | "ordem">>,
  ordemMaterias: readonly string[],
  rankTopico: ReadonlyMap<string, number>
): SecaoAssunto[] {
  const secoes = new Map<string, SecaoAssunto>();
  for (const it of itens) {
    const chave = `${it.materiaId ?? ""}|${it.topicoId ?? ""}`;
    let s = secoes.get(chave);
    if (!s) {
      s = {
        chave,
        topicoId: it.topicoId,
        materiaId: it.materiaId,
        titulo: (it.topicoId && topicoPorId.get(it.topicoId)?.titulo) || "Assunto não encontrado",
        itens: [],
      };
      secoes.set(chave, s);
    }
    s.itens.push(it);
  }
  const posMat = new Map(ordemMaterias.map((id, i) => [id, i]));
  const rank = (s: SecaoAssunto) =>
    s.topicoId
      ? (rankTopico.get(s.topicoId) ?? 1e6 + (topicoPorId.get(s.topicoId)?.ordem ?? 0))
      : 1e9;
  const lista = [...secoes.values()];
  for (const s of lista) s.itens.sort((a, b) => a.ordem - b.ordem);
  return lista.sort(
    (a, b) =>
      (posMat.get(a.materiaId ?? "") ?? 1e9) - (posMat.get(b.materiaId ?? "") ?? 1e9) ||
      rank(a) - rank(b) ||
      a.titulo.localeCompare(b.titulo)
  );
}
