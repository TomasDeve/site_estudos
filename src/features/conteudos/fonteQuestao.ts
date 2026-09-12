/**
 * Helpers para a "fonte" de uma questão (a linha de origem). Ficam num módulo à
 * parte para serem reaproveitados sem criar dependência circular entre a página
 * de questões (que os exibe) e o "Adicionar ao resumo" (que os copia pro resumo).
 */

/**
 * Quebra a fonte de uma questão do QConcursos nas suas partes. Formato canônico:
 * "QConcursos — Q{id} (BANCA) · {ano} · {cargo}" — mas é tolerante às variações antigas
 * ("Q{id} (BANCA)" e "Q{id} (BANCA) · {cargo} · C/E {X}"): extrai o que houver.
 */
export function parseFonteQC(fonte: string) {
  const codM = fonte.match(/Q(\d+)/);
  const codigo = codM ? codM[0] : null; // "Q4023266" (só a parte numérica; ignora sufixo "-a")
  const id = codM ? codM[1] : null;
  const bancaM = fonte.match(/\(([^)]+)\)/); // primeiro parêntese = banca
  const banca = bancaM ? bancaM[1].trim() : null;
  // ano: primeiro "19xx/20xx" fora do código Q (assim o ID numérico não vira "ano")
  const anoM = (codigo ? fonte.replace(codigo, "") : fonte).match(/\b(?:19|20)\d{2}\b/);
  const ano = anoM ? anoM[0] : null;
  // cargo: o que vem depois do parêntese da banca, sem ano, sem marcador C/E e sem separadores
  let cargo: string | null = null;
  if (bancaM) {
    let depois = fonte.slice((bancaM.index ?? 0) + bancaM[0].length);
    depois = depois.replace(/\s*·?\s*(?:C\/E|item)\b.*$/i, ""); // tira "· C/E A" / "· item I"
    if (ano) depois = depois.replace(ano, "");
    cargo =
      depois.replace(/^[\s·\-–—]+/, "").replace(/[\s·\-–—]+$/, "").replace(/\s{2,}/g, " ").trim() ||
      null;
  }
  return { codigo, id, banca, ano, cargo };
}

/** Diz se a fonte é de uma questão real do QConcursos (tem "Q{id}"); as demais são texto livre. */
export function ehFonteQC(fonte: string) {
  return /Q\d+/.test(fonte);
}

/**
 * Cabeçalho da questão em texto puro (sem link, sem o prefixo "QConcursos —"):
 * "Q{id} · {ano} (BANCA) - {cargo}". Usado no resumo, onde só interessa a etiqueta.
 * Se a fonte não for do QConcursos, devolve o texto livre como está.
 */
export function cabecalhoFonte(fonte: string): string {
  const { codigo, id, banca, ano, cargo } = parseFonteQC(fonte);
  if (!id || !codigo) return fonte.trim();
  const cabecalho = [ano, banca ? `(${banca})` : null].filter(Boolean).join(" "); // "2026 (BANCA)"
  const meta = [cabecalho || null, cargo].filter(Boolean).join(" - "); // "2026 (BANCA) - Cargo"
  return meta ? `${codigo} · ${meta}` : codigo;
}
