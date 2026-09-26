import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import type { PlanoHora } from "@/types/db";
import { blocosQueDescem } from "@/features/metas/planoDias";

/**
 * Plano dos próximos dias em blocos de meia hora (6 a 16 por dia). Uma linha por
 * bloco preenchido — bloco livre não tem linha; a coluna `hora` guarda a posição
 * do bloco no dia (nome herdado da 1ª versão, de 1h). A chave é (dia, hora), então as
 * mutações miram `data` + `hora` (não o id): funciona mesmo com a linha
 * otimista, que ainda não tem o id do banco.
 */
const KEY = ["plano_horas"];

/**
 * Bloco feito conta 30 min de estudo: o banco (trigger da migração 0035) cria/
 * apaga a sessão ligada pelo `plano_id`. Aqui só se recarrega o que depende dela
 * — o gráfico "Tempo de estudo" e o "Estudo hoje".
 */
function useRecarregar() {
  const qc = useQueryClient();
  return () => {
    qc.invalidateQueries({ queryKey: KEY });
    qc.invalidateQueries({ queryKey: ["sessoes"] });
  };
}

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

/** `feita` só vem no "Desfazer" do apagar (volta o bloco como estava). */
type Campos = Pick<PlanoHora, "data" | "hora" | "materia_id" | "atividade" | "nota"> & {
  feita?: boolean;
};

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
  const recarregar = useRecarregar();
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
          feita: c.feita ?? false,
          created_at: new Date().toISOString(),
        };
        return [...linhas, nova];
      }),
    onError: (_e, _v, antes) => desfazer(antes),
    onSettled: recarregar,
  });
}

/**
 * Replica um bloco logo abaixo (cópia ainda não feita). Os blocos colados embaixo
 * descem uma posição até o primeiro livre — lido do banco na hora, pra não mover
 * nada com base numa tela desatualizada.
 */
export function useReplicarHora() {
  const recarregar = useRecarregar();
  const mudarCache = useMudarCache();
  const desfazer = useDesfazer();
  return useMutation({
    mutationFn: async (l: PlanoHora) => {
      const { data: dia, error } = await supabase
        .from("plano_horas")
        .select("hora")
        .eq("data", l.data);
      if (error) throw error;
      const descem = blocosQueDescem(
        dia.map((d) => d.hora),
        l.hora
      );
      if (!descem) throw new Error("Não cabe mais nenhum bloco neste dia (máximo de 16).");
      // De baixo pra cima: cada um vai para uma posição que já está livre.
      for (const h of descem) {
        const { error: e } = await supabase
          .from("plano_horas")
          .update({ hora: h + 1 })
          .eq("data", l.data)
          .eq("hora", h);
        if (e) throw e;
      }
      const { error: e2 } = await supabase.from("plano_horas").insert({
        data: l.data,
        hora: l.hora + 1,
        materia_id: l.materia_id,
        atividade: l.atividade,
        nota: l.nota,
      });
      if (e2) throw e2;
    },
    onMutate: (l) =>
      mudarCache((ls) => {
        const descem = blocosQueDescem(
          ls.filter((x) => x.data === l.data).map((x) => x.hora),
          l.hora
        );
        if (!descem) return ls;
        const movem = new Set(descem);
        const copia: PlanoHora = {
          ...l,
          id: `tmp-${l.data}-${l.hora + 1}`,
          hora: l.hora + 1,
          feita: false,
          created_at: new Date().toISOString(),
        };
        return [
          ...ls.map((x) => (x.data === l.data && movem.has(x.hora) ? { ...x, hora: x.hora + 1 } : x)),
          copia,
        ];
      }),
    onError: (_e, _v, antes) => desfazer(antes),
    onSettled: recarregar,
  });
}

/** Libera a hora (apaga a linha). */
export function useLimparHora() {
  const recarregar = useRecarregar();
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
    onSettled: recarregar,
  });
}

/** Marca/desmarca a hora como feita. */
export function useMarcarHoraFeita() {
  const recarregar = useRecarregar();
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
    onSettled: recarregar,
  });
}

/**
 * Copia o plano de um dia para outro (hora por hora, sem o "feita"). O que o
 * destino já tinha nas mesmas horas é trocado; as outras horas ficam. Devolve
 * quantas horas foram copiadas.
 */
export function useCopiarDiaPlano() {
  const recarregar = useRecarregar();
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
    onSettled: recarregar,
  });
}

/** Apaga todas as horas de um dia. */
export function useLimparDiaPlano() {
  const recarregar = useRecarregar();
  const mudarCache = useMudarCache();
  const desfazer = useDesfazer();
  return useMutation({
    mutationFn: async (data: string) => {
      const { error } = await supabase.from("plano_horas").delete().eq("data", data);
      if (error) throw error;
    },
    onMutate: (data) => mudarCache((ls) => ls.filter((l) => l.data !== data)),
    onError: (_e, _v, antes) => desfazer(antes),
    onSettled: recarregar,
  });
}
