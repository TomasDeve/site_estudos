import { useState } from "react";

export type TamanhoLetra = "p" | "m" | "g";

/** Como a folha sai no papel. Gabarito e comentários não vão: a correção é no site. */
export interface OpcoesFolha {
  colunas: 1 | 2;
  letra: TamanhoLetra;
}

const CHAVE = "impressao-opcoes";
// Duas colunas por padrão: é como o aluno pediu a folha (e como vem o caderno da prova).
const PADRAO: OpcoesFolha = { colunas: 2, letra: "m" };

function ler(): OpcoesFolha {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as Partial<OpcoesFolha> | null;
    if (salvo && typeof salvo === "object") {
      return {
        colunas: salvo.colunas === 1 ? 1 : 2,
        letra: salvo.letra === "p" || salvo.letra === "g" ? salvo.letra : "m",
      };
    }
  } catch {
    /* localStorage indisponível ou valor corrompido */
  }
  return PADRAO;
}

/** Preferências da folha (colunas e letra) — preferência de exibição, lembrada no aparelho. */
export function useOpcoesFolha(): [OpcoesFolha, (mudanca: Partial<OpcoesFolha>) => void] {
  const [opcoes, setOpcoes] = useState(ler);
  function mudar(mudanca: Partial<OpcoesFolha>) {
    const nova = { ...opcoes, ...mudanca };
    setOpcoes(nova);
    try {
      localStorage.setItem(CHAVE, JSON.stringify(nova));
    } catch {
      /* ignore */
    }
  }
  return [opcoes, mudar];
}
