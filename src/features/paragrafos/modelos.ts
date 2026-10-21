import { useCallback, useState } from "react";

// Os 3 níveis de correção (a edge function corrigir-paragrafo aceita esses modelos).
// Custo e precisão estimados nos testes de 21/10/2026 (custo refeito com o prompt dos critérios
// da Cebraspe, que ficou maior; Haiku medido em US$ 0,0053): o mesmo parágrafo de
// desenvolvimento (14 linhas, 12 erros de português) corrigido várias vezes por modelo.
export type NivelCorrecao = "economica" | "equilibrada" | "precisa";

export interface InfoNivel {
  nome: string;
  modelo: string;
  esforco: "medium" | "high";
  rotulo: string;
  /** Custo médio por parágrafo, em US$. */
  custo: number;
  /** Precisão estimada, de 1 a 5. */
  precisao: number;
  /** Erros de português encontrados no parágrafo de teste (de 12). */
  errosNoTeste: string;
  descricao: string;
}

export const NIVEIS: Record<NivelCorrecao, InfoNivel> = {
  economica: {
    nome: "Econômica",
    modelo: "claude-haiku-5-5",
    esforco: "medium",
    rotulo: "Haiku 5.5",
    custo: 0.005,
    precisao: 3,
    errosNoTeste: "7 a 11",
    descricao: "Acerta o diagnóstico principal, mas deixa passar erros e detalhes. Boa para pegar o ritmo.",
  },
  equilibrada: {
    nome: "Equilibrada",
    modelo: "claude-sonnet-5-5",
    esforco: "high",
    rotulo: "Sonnet 5.5",
    custo: 0.035,
    precisao: 4,
    errosNoTeste: "7 a 8",
    descricao: "Comentários mais firmes e úteis; às vezes junta dois erros num só.",
  },
  precisa: {
    nome: "Precisa",
    modelo: "claude-opus-5-5",
    esforco: "high",
    rotulo: "Opus 5.5",
    custo: 0.085,
    precisao: 5,
    errosNoTeste: "11 a 12",
    descricao: "Pega quase todos os erros e os detalhes do enunciado. Para a reta final.",
  },
};

/** Parágrafos por mês na conta do custo mensal (10 por dia). */
export const PARAGRAFOS_POR_MES = 300;

const CHAVE = "paragrafos:nivel";

function lerNivel(): NivelCorrecao {
  try {
    const v = localStorage.getItem(CHAVE);
    return v && v in NIVEIS ? (v as NivelCorrecao) : "economica";
  } catch {
    return "economica";
  }
}

/** Nível de correção escolhido (fica guardado neste navegador; padrão: econômica). */
export function useNivelCorrecao(): [NivelCorrecao, (n: NivelCorrecao) => void] {
  const [nivel, setNivel] = useState<NivelCorrecao>(lerNivel);
  const escolher = useCallback((n: NivelCorrecao) => {
    setNivel(n);
    try {
      localStorage.setItem(CHAVE, n);
    } catch {
      /* sem armazenamento: vale só nesta aba */
    }
  }, []);
  return [nivel, escolher];
}

/** Nome curto do modelo gravado no uso da correção ("claude-haiku-5-5" → "Haiku 5.5"). */
export function rotuloDoModelo(modelo: string): string {
  return Object.values(NIVEIS).find((n) => n.modelo === modelo)?.rotulo ?? modelo;
}
