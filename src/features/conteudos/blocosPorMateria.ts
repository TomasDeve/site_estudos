/**
 * Bloquinhos por matéria (modo misturado): cada bloco de 5 é de uma matéria só, e as
 * matérias do filtro se revezam — um bloco de Informática, o seguinte de outra, e
 * assim por diante. Os blocos são montados um a um, ao chegar neles, porque o próximo
 * depende do que ficou para trás: a questão pulada (bloco deixado com ela sem
 * resposta) não se perde — volta no começo de um próximo bloco da matéria dela, mas
 * nunca no bloco logo em seguida (com uma matéria só, pular traria as mesmas de volta).
 */

/** Série curta: 5 questões por vez. */
export const TAMANHO_BLOCO = 5;

export interface BlocoMontado {
  /** A matéria (o grupo) do bloco. */
  grupo: string;
  ids: string[];
}

export interface RegrasDoBloco<T> {
  grupoDe: (item: T) => string;
  /** Mesma chave (ex.: o mesmo texto associado) = não parte entre dois blocos. */
  juntoDe?: (item: T) => string | null | undefined;
  /** Passou por um bloco e segue sem resposta = pulada (volta depois). */
  resolvida: (item: T) => boolean;
  /** Nunca entra num bloco novo (ex.: as já respondidas, em "Para responder"). */
  descartar?: (item: T) => boolean;
}

interface Fila<T> {
  /** Puladas em blocos anteriores ao último — voltam primeiro. */
  voltam: T[];
  /** Nunca entraram num bloco. */
  novas: T[];
  /** Puladas no último bloco: só completam se a matéria não tiver mais nada. */
  recentes: T[];
}

/** O que cada matéria ainda tem para pôr num bloco, e a ordem do revezamento. */
function montarFilas<T extends { id: string }>(
  lista: T[],
  feitos: BlocoMontado[],
  r: RegrasDoBloco<T>
) {
  const ultimoBloco = new Map<string, number>();
  feitos.forEach((b, i) => b.ids.forEach((id) => ultimoBloco.set(id, i)));

  // O revezamento segue a 1ª aparição de cada matéria na lista (já embaralhada).
  const porGrupo = new Map<string, Fila<T>>();
  for (const q of lista) {
    const g = r.grupoDe(q);
    if (!porGrupo.has(g)) porGrupo.set(g, { voltam: [], novas: [], recentes: [] });
  }

  const puladas: { q: T; bloco: number }[] = [];
  for (const q of lista) {
    const bloco = ultimoBloco.get(q.id);
    if (bloco === undefined) {
      if (!r.descartar?.(q)) porGrupo.get(r.grupoDe(q))!.novas.push(q);
    } else if (!r.resolvida(q)) {
      puladas.push({ q, bloco });
    }
  }
  // Voltam na ordem em que foram puladas.
  puladas.sort((a, b) => a.bloco - b.bloco);
  for (const { q, bloco } of puladas) {
    const f = porGrupo.get(r.grupoDe(q))!;
    (bloco < feitos.length - 1 ? f.voltam : f.recentes).push(q);
  }
  return { porGrupo, ordem: [...porGrupo.keys()] };
}

/** As 5 primeiras da fila — passando de 5 se a 5ª for de um texto que continua. */
function cortar<T>(fila: T[], juntoDe?: (item: T) => string | null | undefined): T[] {
  let n = Math.min(TAMANHO_BLOCO, fila.length);
  const chave = n > 0 ? juntoDe?.(fila[n - 1]) : null;
  if (chave) while (n < fila.length && juntoDe!(fila[n]) === chave) n++;
  return fila.slice(0, n);
}

/**
 * O bloco seguinte aos já montados: a próxima matéria do revezamento que ainda tem
 * questão, com as puladas dela na frente. `null` quando não sobra nada.
 */
export function montarProximoBloco<T extends { id: string }>(
  lista: T[],
  feitos: BlocoMontado[],
  r: RegrasDoBloco<T>
): BlocoMontado | null {
  const { porGrupo, ordem } = montarFilas(lista, feitos, r);
  const anterior = feitos.length ? ordem.indexOf(feitos[feitos.length - 1].grupo) : -1;
  for (let j = 1; j <= ordem.length; j++) {
    const g = ordem[(anterior + j) % ordem.length];
    const f = porGrupo.get(g)!;
    const fila = [...f.voltam, ...f.novas, ...f.recentes];
    if (fila.length) return { grupo: g, ids: cortar(fila, r.juntoDe).map((q) => q.id) };
  }
  return null;
}

/**
 * Quantos blocos ainda faltam montar depois dos feitos. As puladas do último bloco
 * não contam: é o bloco em resolução — se você pular, elas entram na conta.
 */
export function blocosRestantes<T extends { id: string }>(
  lista: T[],
  feitos: BlocoMontado[],
  r: RegrasDoBloco<T>
): number {
  let n = 0;
  for (const f of montarFilas(lista, feitos, r).porGrupo.values()) {
    n += Math.ceil((f.voltam.length + f.novas.length) / TAMANHO_BLOCO);
  }
  return n;
}
