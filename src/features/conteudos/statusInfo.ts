import type { TopicoStatus } from "@/types/db";

export const STATUS_INFO: Record<
  TopicoStatus,
  { label: string; cor: string; bg: string }
> = {
  nao_estudado: { label: "Não estudado", cor: "var(--color-mut)", bg: "transparent" },
  estudando: { label: "Estudando", cor: "var(--color-amber)", bg: "rgb(232 185 62 / 0.12)" },
  concluido: { label: "Concluído", cor: "var(--color-green)", bg: "rgb(63 191 127 / 0.12)" },
  revisar: { label: "Revisar", cor: "var(--color-blue)", bg: "rgb(79 157 222 / 0.12)" },
};
