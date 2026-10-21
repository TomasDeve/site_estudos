// Lê uma linha de repertório ("Lei 9.807/1999: programas… (Anuário 2026)") e separa o tipo
// (dado, lei/decisão, caso), o rótulo antes dos dois-pontos, o texto e a fonte, para o
// repertório mostrar cada informação organizada, com cor e ícone pelo tipo.

export type TipoInformacao = "dado" | "lei" | "caso" | "frase" | "info";

export interface Informacao {
  tipo: TipoInformacao;
  rotulo?: string;
  texto: string;
  fonte?: string;
}

const PARECE_FONTE =
  /(Anuário|FBSP|Fórum Brasileiro|Sou da Paz|UFPE|MPPE|Atlas da Violência|SDS-PE|Cebraspe|Governo de|Banco Mundial|Ipea|TJMG)/i;
const PARECE_LEI =
  /^(Lei|CF|CP|CPP|ECA|LEP|LGPD|Decreto|Portaria|STF|STJ|ADPF|ADO|PEC|EC \d+|Resolução|Estatuto|Convenção|Marco Civil|Código|Súmula|Lei de|Lei Maria|Constituição)\b/;
// Número de verdade (estatística), e não ano ("de 2007") nem artigo de lei: milhar com ponto,
// porcentagem, "mil", "1 em cada 3", "R$", ou uma quantidade seguida do que ela conta.
const TEM_NUMERO =
  /\d[\d.,]*\s?(%|mil\b|milh|bilh|bi\b|vezes|por 100 mil)|\b\d+ em cada \d+|R\$\s?\d|\b\d{1,3}(?:\.\d{3})+\b|\b\d{2,3} (?:policiais|mortes|presos|registros|casos|servidores|armas|vítimas|feminicídios|suicídios|assassinatos|desaparecimentos|estupros|ocorrências)/i;

/** Tipo pelo conteúdo: lei/decisão se começa por norma ou tribunal; dado se traz número; senão caso. */
export function tipoDaInformacao(rotulo: string | undefined, texto: string): TipoInformacao {
  const cabeca = rotulo ?? texto;
  if (PARECE_LEI.test(cabeca)) return "lei";
  if (TEM_NUMERO.test(`${rotulo ?? ""} ${texto}`)) return "dado";
  return "caso";
}

export function maiuscula(s: string): string {
  return s ? s[0].toLocaleUpperCase("pt-BR") + s.slice(1) : s;
}

/**
 * Separa uma linha em rótulo, texto e fonte.
 * `tipoDado` vem do "Para decorar" do PDF (numero, lei, exemplo, frase, essencial).
 */
export function lerInformacao(bruto: string, opcoes: { rotulo?: string; tipoDado?: string } = {}): Informacao {
  let texto = bruto.trim();
  let fonte: string | undefined;

  // "(fonte: X)" em qualquer lugar do texto (formato do "Para decorar")
  texto = texto.replace(/\s*\(fonte:\s*((?:[^()]|\([^()]*\))+)\)/i, (_, f: string) => {
    fonte = f.trim();
    return "";
  });

  // fonte entre parênteses no fim: "… (Anuário 2026)."
  if (!fonte) {
    const fim = texto.match(/\s*\(((?:[^()]|\([^()]*\))+)\)\.?$/);
    if (fim && PARECE_FONTE.test(fim[1])) {
      fonte = fim[1].trim();
      texto = texto.slice(0, fim.index).trim().replace(/[;,]$/, "");
    }
  }

  let rotulo = opcoes.rotulo?.trim() || undefined;
  if (!rotulo) {
    const dp = texto.indexOf(": ");
    if (dp > 0 && dp <= 80 && !texto.slice(0, dp).includes(";")) {
      rotulo = texto.slice(0, dp);
      texto = maiuscula(texto.slice(dp + 2));
    }
  }
  texto = texto.trim();
  if (texto && !/[.!?"”]$/.test(texto)) texto += ".";

  const mapa: Record<string, TipoInformacao> = { numero: "dado", lei: "lei", exemplo: "caso", frase: "frase" };
  const tipo = (opcoes.tipoDado && mapa[opcoes.tipoDado]) || tipoDaInformacao(rotulo, texto);
  // o número continua a frase ("1 em cada 3" + "homicídios…"); nos outros o rótulo é título
  if (tipo !== "dado") texto = maiuscula(texto);
  return { tipo, rotulo, texto, fonte };
}
