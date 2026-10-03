import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { RotinaBloco, TablesInsert } from "@/types/db";

const CHAVE = ["rotina_blocos"] as const;

/** Todos os blocos da rotina (são poucos — dezenas, no máximo). */
export function useRotina() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: async (): Promise<RotinaBloco[]> => {
      const { data, error } = await supabase
        .from("rotina_blocos")
        .select("*")
        .order("inicio")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export type BlocoNovo = Pick<TablesInsert<"rotina_blocos">, "titulo" | "tipo" | "inicio" | "fim" | "dias">;

/**
 * Cria (sem `id`) ou atualiza (com `id`) um bloco. Otimista: a linha do tempo
 * muda na hora; o refetch no fim só confirma.
 */
export function useSalvarBloco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (b: BlocoNovo & { id?: string }) => {
      if (b.id) {
        const { id, ...resto } = b;
        const { error } = await supabase.from("rotina_blocos").update(resto).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("rotina_blocos").insert(b);
        if (error) throw error;
      }
    },
    onMutate: async (b) => {
      await qc.cancelQueries({ queryKey: CHAVE });
      const prev = qc.getQueryData<RotinaBloco[]>(CHAVE);
      qc.setQueryData<RotinaBloco[]>(CHAVE, (old = []) =>
        b.id
          ? old.map((x) => (x.id === b.id ? { ...x, ...b, id: x.id } : x))
          : [
              ...old,
              {
                id: `tmp-${Date.now()}`,
                user_id: "",
                created_at: new Date().toISOString(),
                titulo: b.titulo ?? "",
                tipo: b.tipo ?? "outro",
                inicio: b.inicio,
                fim: b.fim,
                dias: b.dias ?? [],
              },
            ]
      );
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(CHAVE, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useExcluirBloco() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("rotina_blocos").delete().eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: CHAVE });
      const prev = qc.getQueryData<RotinaBloco[]>(CHAVE);
      qc.setQueryData<RotinaBloco[]>(CHAVE, (old = []) => old.filter((x) => x.id !== id));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(CHAVE, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

/** Cria vários blocos de uma vez (o "Montar com um modelo"). */
export function useCriarBlocos() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (blocos: BlocoNovo[]) => {
      const { error } = await supabase.from("rotina_blocos").insert(blocos);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}
