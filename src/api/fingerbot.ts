import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { FingerbotAvulso, FingerbotHorario, TablesInsert, TablesUpdate } from "@/types/db";

const CHAVE = ["fingerbot", "horarios"];
const CHAVE_DISPAROS = ["fingerbot", "disparos"];
const CHAVE_CONFIG = ["fingerbot", "config"];
const CHAVE_AVULSOS = ["fingerbot", "avulsos"];

/** Horários do cubo, do mais cedo para o mais tarde. */
export function useFingerbotHorarios() {
  return useQuery({
    queryKey: CHAVE,
    queryFn: async (): Promise<FingerbotHorario[]> => {
      const { data, error } = await supabase
        .from("fingerbot_horarios")
        .select("*")
        .order("hora")
        .order("created_at");
      if (error) throw error;
      return data;
    },
  });
}

export function useCriarFingerbotHorario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: TablesInsert<"fingerbot_horarios">) => {
      const { error } = await supabase.from("fingerbot_horarios").insert(input);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

/** Atualiza um horário (hora, dias, ligado/desligado, rótulo); remenda o cache na hora. */
export function useAtualizarFingerbotHorario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, ...patch }: { id: string } & TablesUpdate<"fingerbot_horarios">) => {
      const { error } = await supabase.from("fingerbot_horarios").update(patch).eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, ...patch }) => {
      await qc.cancelQueries({ queryKey: CHAVE });
      const prev = qc.getQueryData<FingerbotHorario[]>(CHAVE);
      qc.setQueryData<FingerbotHorario[]>(CHAVE, (old) => old?.map((h) => (h.id === id ? { ...h, ...patch } : h)));
      return { prev };
    },
    onError: (_e, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(CHAVE, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

export function useExcluirFingerbotHorario() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("fingerbot_horarios").delete().eq("id", id);
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE }),
  });
}

/** Se o link do webhook do MacroDroid já está salvo (o link em si não aparece na tela). */
export function useFingerbotConfigurado() {
  return useQuery({
    queryKey: CHAVE_CONFIG,
    queryFn: async (): Promise<boolean> => {
      const { data, error } = await supabase.from("fingerbot_config").select("user_id").maybeSingle();
      if (error) throw error;
      return !!data;
    },
  });
}

/** Troca o link do webhook (quando o MacroDroid gerar outro). */
export function useSalvarFingerbotWebhook() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (webhook_url: string) => {
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase
        .from("fingerbot_config")
        .upsert({ user_id: u.user?.id, webhook_url, updated_at: new Date().toISOString() });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE_CONFIG }),
  });
}

export interface FingerbotDisparo {
  id: number;
  origem: string;
  horario_id: string | null;
  criado_em: string;
  status_code: number | null;
  erro: string | null;
  /** Só nos registros vindos do celular (origem "celular"). */
  resultado: string | null;
  bateria: number | null;
  detalhe: string | null;
  /** Rótulo do aperto avulso que gerou este registro (se foi um). */
  avulso_rotulo: string | null;
}

export interface FingerbotCelular {
  vistoEm: string | null;
  bateria: number | null;
}

/** Quando o app do celular baixou os horários pela última vez e a bateria do cubo.
 *  `rapido`: confere a cada 3 s (logo depois de agendar um avulso, para o "✓ no celular" aparecer na hora). */
export function useFingerbotCelular(rapido = false) {
  return useQuery({
    queryKey: [...CHAVE_CONFIG, "celular"],
    queryFn: async (): Promise<FingerbotCelular> => {
      const { data, error } = await supabase
        .from("fingerbot_config")
        .select("celular_visto_em, celular_bateria")
        .maybeSingle();
      if (error) throw error;
      return { vistoEm: data?.celular_visto_em ?? null, bateria: data?.celular_bateria ?? null };
    },
    refetchInterval: rapido ? 3_000 : 60_000,
  });
}

/** Últimos disparos: pedidos do site (agenda/manual) e os apertos registrados pelo celular. */
export function useFingerbotDisparos() {
  return useQuery({
    queryKey: CHAVE_DISPAROS,
    queryFn: async (): Promise<FingerbotDisparo[]> => {
      const { data, error } = await supabase.rpc("fingerbot_ultimos_disparos", { p_limite: 15 });
      if (error) throw error;
      return data ?? [];
    },
    refetchInterval: 30_000,
  });
}

/** "Apertar agora": chama o webhook na hora (o banco trava repetição em menos de 40 s). */
export function useApertarAgora() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("fingerbot_apertar_agora");
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: CHAVE_DISPAROS });
      // o pg_net grava a resposta alguns segundos depois
      setTimeout(() => qc.invalidateQueries({ queryKey: CHAVE_DISPAROS }), 5000);
    },
  });
}

/** Apertos avulsos (uma vez só) que ainda vão acontecer (ou acabaram de vencer). */
export function useFingerbotAvulsos() {
  return useQuery({
    queryKey: CHAVE_AVULSOS,
    queryFn: async (): Promise<FingerbotAvulso[]> => {
      const desde = new Date(Date.now() - 3 * 60_000).toISOString();
      const { data, error } = await supabase
        .from("fingerbot_avulsos")
        .select("*")
        .eq("cancelado", false)
        .is("feito_em", null)
        .gt("quando", desde)
        .order("quando");
      if (error) throw error;
      return data;
    },
    refetchInterval: 10_000,
  });
}

/** Agenda um aperto daqui a N minutos; o banco avisa o celular na hora (webhook ?acao=sincronizar). */
export function useAgendarAvulso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ minutos, rotulo }: { minutos: number; rotulo: string }) => {
      const { error } = await supabase.rpc("fingerbot_agendar_avulso", { p_minutos: minutos, p_rotulo: rotulo });
      if (error) throw error;
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: CHAVE_AVULSOS });
      // o celular baixa a agenda alguns segundos depois do aviso
      setTimeout(() => qc.invalidateQueries({ queryKey: [...CHAVE_CONFIG, "celular"] }), 6000);
    },
  });
}

export function useCancelarAvulso() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.rpc("fingerbot_cancelar_avulso", { p_id: id });
      if (error) throw error;
    },
    onSettled: () => qc.invalidateQueries({ queryKey: CHAVE_AVULSOS }),
  });
}
