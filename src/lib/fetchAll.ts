/**
 * O PostgREST corta qualquer resposta em 1000 linhas (mesmo com .limit maior).
 * Este helper pagina com .range() até esgotar.
 */
export async function fetchAll<T>(
  query: (from: number, to: number) => PromiseLike<{ data: T[] | null; error: unknown }>
): Promise<T[]> {
  const PAGE = 1000;
  let from = 0;
  const out: T[] = [];
  for (;;) {
    const { data, error } = await query(from, from + PAGE - 1);
    if (error) throw error;
    const rows = data ?? [];
    out.push(...rows);
    if (rows.length < PAGE) return out;
    from += PAGE;
  }
}
