/**
 * Parser tolerante para texto colado das estatísticas do Qconcursos.
 * Funções puras (testadas em parser.test.ts) — sem dependência do Supabase.
 *
 * Formatos aceitos (entre outros):
 *   "Língua Portuguesa\t120\t90\t30"            → nome, total, acertos, erros
 *   "Direito Penal 50 40 80%"                    → nome, total, acertos, % (validação)
 *   linhas separadas: nome / "120 questões" / "90 acertos (75%)"
 */

export type Confianca = "alta" | "media" | "baixa";

export interface ParsedRow {
  materiaTexto: string;
  total: number;
  acertos: number;
  confianca: Confianca;
}

/** minúsculas, sem acentos, sem pontuação, espaços colapsados */
export function normalizar(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9 ]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** "1.234" → "1234" (separador de milhar pt-BR), preservando percentuais "72,5%" */
function limparNumeros(linha: string): string {
  return linha.replace(/(\d)\.(\d{3})(?!\d)/g, "$1$2");
}

interface Numeros {
  valores: number[];
  pct: number | null;
}

function extrairNumeros(linha: string): Numeros {
  const pctMatch = linha.match(/(\d{1,3}(?:[.,]\d+)?)\s*%/);
  const pct = pctMatch ? Number(pctMatch[1].replace(",", ".")) : null;
  const semPct = linha.replace(/\d{1,3}(?:[.,]\d+)?\s*%/g, " ");
  const valores = (semPct.match(/\d+/g) ?? []).map(Number);
  return { valores, pct };
}

/** Combina uma lista de números (+% opcional) em {total, acertos} plausível. */
function montarRegistro(nums: number[], pct: number | null): { total: number; acertos: number; confianca: Confianca } | null {
  if (nums.length >= 3) {
    const [a, b, c] = nums;
    // total, acertos, erros
    if (b + c === a && a > 0) return { total: a, acertos: b, confianca: "alta" };
    // acertos, erros, total
    if (a + b === c && c > 0) return { total: c, acertos: a, confianca: "alta" };
  }
  if (nums.length >= 2) {
    let [total, acertos] = nums;
    if (acertos > total) [total, acertos] = [acertos, total];
    if (total <= 0 || acertos < 0) return null;
    if (pct !== null) {
      const calc = (acertos / total) * 100;
      if (Math.abs(calc - pct) <= 2.5) return { total, acertos, confianca: "alta" };
      // o % contradiz — usa o % como fonte de acertos
      const porPct = Math.round((pct / 100) * total);
      if (porPct >= 0 && porPct <= total) return { total, acertos: porPct, confianca: "media" };
    }
    return { total, acertos, confianca: "media" };
  }
  if (nums.length === 1 && pct !== null) {
    const total = nums[0];
    const acertos = Math.round((pct / 100) * total);
    if (total > 0) return { total, acertos, confianca: "media" };
  }
  return null;
}

/** Palavras de cabeçalho/controle da página — uma linha feita SÓ delas não é matéria. */
const LIXO_PALAVRAS = new Set([
  "disciplina", "disciplinas", "materia", "materias", "assunto", "assuntos",
  "desempenho", "estatistica", "estatisticas", "total", "geral",
  "resolvida", "resolvidas", "resolvidos", "acerto", "acertos", "erro", "erros",
  "percentual", "aproveitamento", "filtrar", "ver", "mais", "carregar",
  "questao", "questoes", "de", "em", "por",
]);

function pareceNomeMateria(linha: string): boolean {
  const n = normalizar(linha);
  if (n.length < 3 || n.length > 90) return false;
  if (/^\d/.test(n)) return false;
  const palavras = n.split(" ").filter(Boolean);
  if (palavras.every((p) => LIXO_PALAVRAS.has(p))) return false;
  const letras = n.replace(/[^a-z]/g, "").length;
  return letras >= 3;
}

export function parseQconcursos(texto: string): ParsedRow[] {
  const linhas = texto
    .split(/\r?\n/)
    .map((l) => limparNumeros(l.replace(/\t/g, " ").trim()))
    .filter((l) => l.length > 0);

  const rows: ParsedRow[] = [];
  let nomePendente: string | null = null;
  let numerosPendentes: number[] = [];
  let pctPendente: number | null = null;

  const fecharPendente = () => {
    if (nomePendente && numerosPendentes.length > 0) {
      const r = montarRegistro(numerosPendentes, pctPendente);
      if (r) {
        rows.push({ materiaTexto: nomePendente, ...r, confianca: r.confianca === "alta" ? "alta" : "media" });
      }
    }
    nomePendente = null;
    numerosPendentes = [];
    pctPendente = null;
  };

  for (const linha of linhas) {
    const { valores, pct } = extrairNumeros(linha);
    const textoSemNumeros = linha
      .replace(/\d{1,3}(?:[.,]\d+)?\s*%/g, " ")
      .replace(/\d+/g, " ")
      .replace(/\b(questoes|questões|resolvidas|acertos?|erros?|de)\b/gi, " ")
      .replace(/[()·|-]+/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    const temNome = textoSemNumeros.length >= 3 && pareceNomeMateria(textoSemNumeros);
    const temNumeros = valores.length > 0 || pct !== null;

    if (temNome && temNumeros) {
      // linha única completa: "Direito Penal 50 40 10"
      fecharPendente();
      const r = montarRegistro(valores, pct);
      if (r) rows.push({ materiaTexto: textoSemNumeros, ...r });
    } else if (temNome) {
      // começa um novo grupo
      fecharPendente();
      nomePendente = textoSemNumeros;
    } else if (temNumeros && nomePendente) {
      numerosPendentes.push(...valores);
      if (pct !== null) pctPendente = pct;
      // grupo completo com 3 números ou (2 números + %)
      if (numerosPendentes.length >= 3 || (numerosPendentes.length >= 2 && pctPendente !== null)) {
        fecharPendente();
      }
    }
  }
  fecharPendente();

  return rows.filter((r) => r.total > 0 && r.acertos >= 0 && r.acertos <= r.total);
}

/* ---------------- matching nome → matéria ---------------- */

export interface MateriaRef {
  id: string;
  slug: string;
  nome: string;
}

/** apelidos comuns do Qconcursos → slug do catálogo */
const DICIONARIO: Record<string, string> = {
  portugues: "portugues",
  "lingua portuguesa": "portugues",
  "portugues lingua portuguesa": "portugues",
  informatica: "informatica",
  "nocoes de informatica": "informatica",
  "direito constitucional": "dconst",
  "direito administrativo": "dadm",
  "direito processual penal": "dpp",
  "processo penal": "dpp",
  "direito penal": "leis",
  "legislacao penal especial": "leis",
  "leis penais especiais": "leis",
  "direitos humanos": "dh",
  matematica: "mat_fin",
  "matematica financeira": "mat_fin",
  "raciocinio logico": "rlm",
  "raciocinio logico matematico": "rlm",
  atualidades: "atualidades",
  etica: "etica",
  "etica no servico publico": "etica",
  "direito penal militar": "dpm",
  "direito processual penal militar": "dppm",
};

function tokens(s: string): Set<string> {
  return new Set(normalizar(s).split(" ").filter((t) => t.length > 2));
}

function sobreposicao(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let comum = 0;
  for (const t of a) if (b.has(t)) comum++;
  return (2 * comum) / (a.size + b.size);
}

export interface MatchResultado {
  materiaId: string | null;
  confianca: Confianca;
}

export function matchMateria(
  nomeCru: string,
  materias: MateriaRef[],
  aliasesDB: Map<string, string>
): MatchResultado {
  const n = normalizar(nomeCru);

  // 1. exato por nome/slug
  const exato = materias.find((m) => normalizar(m.nome) === n || m.slug === n);
  if (exato) return { materiaId: exato.id, confianca: "alta" };

  // 2. alias salvo pelo usuário em import anterior
  const porAlias = aliasesDB.get(n);
  if (porAlias) return { materiaId: porAlias, confianca: "alta" };

  // 3. dicionário de apelidos comuns
  const slugDic = DICIONARIO[n];
  if (slugDic) {
    const m = materias.find((x) => x.slug === slugDic);
    if (m) return { materiaId: m.id, confianca: "alta" };
  }

  // 4. fuzzy por sobreposição de tokens
  const alvo = tokens(nomeCru);
  let melhor: { id: string; score: number } | null = null;
  for (const m of materias) {
    const score = sobreposicao(alvo, tokens(m.nome));
    if (score >= 0.6 && (!melhor || score > melhor.score)) melhor = { id: m.id, score };
  }
  if (melhor) return { materiaId: melhor.id, confianca: melhor.score >= 0.85 ? "media" : "baixa" };

  return { materiaId: null, confianca: "baixa" };
}
