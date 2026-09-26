import { useMemo, useState } from "react";
import { toast } from "sonner";
import type { Materia } from "@/types/db";
import { useConcursoAtual } from "@/layouts/ConcursoLayout";
import { useOrdemCicloPlano } from "@/api/concursos";
import { usePlanoDesde } from "@/api/planoHoras";
import { contarCiclo, ordenarCiclo, type ContagemCiclo } from "./cicloPlano";

/** Cópia da ordem do ciclo neste navegador: vale enquanto a migração 0038 não roda. */
const chaveOrdem = (concursoId: string) => `plano.cicloOrdem.${concursoId}`;

function lerOrdemLocal(concursoId: string): string[] | null {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(chaveOrdem(concursoId)) ?? "null");
    return Array.isArray(v) && v.every((x) => typeof x === "string") ? v : null;
  } catch {
    return null;
  }
}

function gravarOrdemLocal(concursoId: string, ordem: string[] | null) {
  try {
    if (ordem) localStorage.setItem(chaveOrdem(concursoId), JSON.stringify(ordem));
    else localStorage.removeItem(chaveOrdem(concursoId));
  } catch {
    /* localStorage indisponível: vale só nesta visita */
  }
}

// O aviso da migração aparece uma vez por visita, não a cada arraste.
let avisouMigracao = false;

export interface CicloDoPlano {
  /** As matérias do edital, na ordem do ciclo (a arrastada, ou a do edital). */
  materias: Materia[];
  /** Blocos de cada matéria no plano desde o início do ciclo. */
  contagem: Map<string, ContagemCiclo>;
  /** Início do ciclo ("Novo ciclo"); nulo = o plano inteiro. */
  desde: string | null;
  /** A ordem do ciclo é diferente da do edital. */
  personalizada: boolean;
  /** Grava a ordem (ids em sequência); `null` volta à ordem do edital. */
  reordenar: (ids: string[] | null) => void;
}

/**
 * O ciclo das matérias do Painel: a ordem (a que você arrastou, gravada no
 * concurso — ou, antes da migração 0038, neste navegador) e quantos blocos de
 * cada matéria já entraram no plano. Usado pela faixa do ciclo e pelo modal do
 * bloco, pra os dois mostrarem a mesma ordem.
 */
export function useCicloDoPlano(doEdital: Materia[]): CicloDoPlano {
  const concurso = useConcursoAtual();
  const desde = concurso.ciclo_plano_inicio ?? null;
  const { data: linhas } = usePlanoDesde(desde);
  const contagem = useMemo(() => contarCiclo(linhas ?? [], desde), [linhas, desde]);
  const salvar = useOrdemCicloPlano();

  const [versaoLocal, setVersaoLocal] = useState(0);
  // `versaoLocal` só força reler depois de gravar.
  const local = useMemo(() => lerOrdemLocal(concurso.id), [concurso.id, versaoLocal]);
  // No banco vale para o PC e o celular; sem a coluna (ou sem nada gravado lá), a
  // cópia deste navegador.
  const ordem = concurso.ciclo_plano_ordem ?? local;
  const materias = useMemo(() => ordenarCiclo(doEdital, ordem), [doEdital, ordem]);
  const personalizada = materias.some((m, i) => m.id !== doEdital[i]?.id);

  function reordenar(ids: string[] | null) {
    gravarOrdemLocal(concurso.id, ids);
    setVersaoLocal((v) => v + 1);
    salvar.mutate(
      { id: concurso.id, ciclo_plano_ordem: ids },
      {
        onError: (err) => {
          const e = err as { message?: string } | null;
          if (e?.message?.includes("ciclo_plano_ordem")) {
            if (avisouMigracao) return;
            avisouMigracao = true;
            toast.info(
              "Ordem do ciclo salva só neste navegador. Para valer no celular também, rode a migração 0038 no Supabase → SQL Editor.",
              { duration: 8000 }
            );
            return;
          }
          toast.error(err instanceof Error ? err.message : String(err));
        },
      }
    );
  }

  return { materias, contagem, desde, personalizada, reordenar };
}
