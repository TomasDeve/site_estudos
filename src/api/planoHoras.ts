import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PlanoHora } from "@/types/db";

/**
 * Plano dos próximos dias, hora a hora (até 5 por dia). Uma linha por hora
 * preenchida — hora livre não tem linha. A chave é (dia, hora), então as
 * mutações miram `data` + `hora` (não o id): funciona mesmo com a linha
 * otimista, que ainda não tem o id do banco.
 */
const KEY = ["plano_horas"];

export function usePlanoHoras(inicio: string, fim: string) {
  return useQuery({
    queryKey: [...KEY, inicio, fim],
    queryFn: async (): Promise<PlanoHora[]> => {
      const { data, error } = await supabase
        .from("plano_horas")
        .select("*")
        .gte("data", inicio)
        .lte("data", fim)
        .order("data")
        .order("hora");
      if (error) throw error;
      return data;
    },
    // Tabela ainda não criada: não adianta tentar de novo até rodarem o SQL.
    retry: (n, err) => !tabelaFaltando(err) && n < 2,
  });
}

/** A migração 0033 ainda não foi rodada no Supabase (tabela inexistente). */
export function tabelaFaltando(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null;
  return (
    e?.code === "PGRST205" ||
    e?.code === "42P01" ||
    (!!e?.message && e.message.includes("plano_horas"))
  );
}

type Campos = Pick<PlanoHora, "data" | "hora" | "materia_id" | "atividade" | "nota">;

/** Aplica uma mudança em todas as janelas de dias em cache (otimista). */
function useMudarCache() {
  const qc = useQueryClient();
  return async (mudar: (linhas: PlanoHora[]) => PlanoHora[]) => {
    await qc.cancelQueries({ queryKey: KEY });
    const antes = qc.getQueriesData<PlanoHora[]>({ queryKey: KEY });
    qc.setQueriesData<PlanoHora[]>({ queryKey: KEY }, (old) => (old ? mudar(old) : old));
    return antes;
  };
}

function useDesfazer() {
  const qc = useQueryClient();
  return (antes: [readonly unknown[], PlanoHora[] | undefined][] | undefined) => {
    for (const [key, dados] of antes ?? []) qc.setQueryData(key, dados);
  };
}

const mesmaHora = (l: PlanoHora, data: string, hora: number) => l.data === data && l.hora === hora;

/** Preenche (ou troca) o que vai ser feito numa hora do dia. Mantém o "feita". */
export function useSalvarHora() {
  const qc = useQueryClient();
  const mudarCache = useMudarCache();
  const desfazer = useDesfazer();
  return useMutation({
    mutationFn: async (c: Campos) => {
      const { error } = await supabase
        .from("plano_horas")
        .upsert(c, { onConflict: "user_id,data,hora" });
      if (error) throw error;
    },
    onMutate: (c) =>
      mudarCache((linhas) => {
        const atual = linhas.find((l) => mesmaHora(l, c.data, c.hora));
        if (atual) return linhas.map((l) => (l === atual ? { ...l, ...c } : l));
        const nova: PlanoHora = {
          ...c,
          id: `tmp-${c.data}-${c.hora}`,
          user_id: "",
          feita: false,
          created_at: new Date().toISOString(),
        };
        return [...linhas, nova];
      }),
    onError: (_e, _v, antes) => desfazer(antes),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Libera a hora (apaga a linha). */
export function useLimparHora() {
  const qc = useQueryClient();
  const mudarCache = useMudarCache();
  const desfazer = useDesfazer();
  return useMutation({
    mutationFn: async ({ data, hora }: { data: string; hora: number }) => {
      const { error } = await supabase
        .from("plano_horas")
        .delete()
        .eq("data", data)
        .eq("hora", hora);
      if (error) throw error;
    },
    onMutate: ({ data, hora }) => mudarCache((ls) => ls.filter((l) => !mesmaHora(l, data, hora))),
    onError: (_e, _v, antes) => desfazer(antes),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Marca/desmarca a hora como feita. */
export function useMarcarHoraFeita() {
  const qc = useQueryClient();
  const mudarCache = useMudarCache();
  const desfazer = useDesfazer();
  return useMutation({
    mutationFn: async ({ data, hora, feita }: { data: string; hora: number; feita: boolean }) => {
      const { error } = await supabase
        .from("plano_horas")
        .update({ feita })
        .eq("data", data)
        .eq("hora", hora);
      if (error) throw error;
    },
    onMutate: ({ data, hora, feita }) =>
      mudarCache((ls) => ls.map((l) => (mesmaHora(l, data, hora) ? { ...l, feita } : l))),
    onError: (_e, _v, antes) => desfazer(antes),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/**
 * Copia o plano de um dia para outro (hora por hora, sem o "feita"). O que o
 * destino já tinha nas mesmas horas é trocado; as outras horas ficam. Devolve
 * quantas horas foram copiadas.
 */
export function useCopiarDiaPlano() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ de, para }: { de: string; para: string }) => {
      const { data: origem, error } = await supabase
        .from("plano_horas")
        .select("hora, materia_id, atividade, nota")
        .eq("data", de);
      if (error) throw error;
      if (!origem.length) return 0;
      const { error: e2 } = await supabase.from("plano_horas").upsert(
        origem.map((l) => ({ ...l, data: para, feita: false })),
        { onConflict: "user_id,data,hora" }
      );
      if (e2) throw e2;
      return origem.length;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

/** Apaga todas as horas de um dia. */
export function useLimparDiaPlano() {
  const qc = useQueryClient();
  const mudarCache = useMudarCache();
  const desfazer = useDesfazer();
  return useMutation({
    mutationFn: async (data: string) => {
      const { error } = await supabase.from("plano_horas").delete().eq("data", data);
      if (error) throw error;
    },
    onMutate: (data) => mudarCache((ls) => ls.filter((l) => l.data !== data)),
    onError: (_e, _v, antes) => desfazer(antes),
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
