import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Redacao, TablesInsert } from "@/types/db";

const KEY = ["redacoes"];

/** Todas as redações do usuário (filtra por concurso/matéria no componente). */
export function useRedacoes() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Redacao[]> => {
      const { data, error } = await supabase
        .from("redacoes")
        .select("*")
        .order("numero")
        .order("data");
      if (error) throw error;
      return data;
    },
  });
}

export function useCriarRedacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"redacoes">) => {
      const { data, error } = await supabase
        .from("redacoes")
        .insert(input)
        .select("*")
        .single();
      if (error) throw error;
      return data as Redacao;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

type CamposRedacao = Partial<
  Pick<Redacao, "tema" | "nota" | "nota_max" | "data" | "observacoes" | "numero">
>;

export function useAtualizarRedacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...campos }: { id: string } & CamposRedacao) => {
      const { error } = await supabase.from("redacoes").update(campos).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}

export function useExcluirRedacao() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("redacoes").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: KEY }),
  });
}
