import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { Caderno } from "@/types/db";

/** Cadernos impressos de todos os concursos (a página filtra pelo concurso aberto). */
export function useCadernos() {
  return useQuery({
    queryKey: ["cadernos"],
    queryFn: async (): Promise<Caderno[]> => {
      const { data, error } = await supabase.from("cadernos").select("*").order("ordem");
      if (error) throw error;
      return data;
    },
  });
}
