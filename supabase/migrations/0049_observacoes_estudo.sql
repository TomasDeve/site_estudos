-- 0049 — Observações do estudo, por matéria no concurso.
-- Ficam ao lado do "O que vai estudar?" no bloco do Painel e valem para todos os
-- blocos da matéria até serem apagadas (ex.: "reforçar os macetes de desvio
-- padrão depois"). O "O que vai estudar?" continua sendo o recado da próxima vez
-- (proximo_estudo) e o detalhe de cada bloco (plano_horas.nota).
-- Idempotente. Rode no Supabase → SQL Editor (ou pelo MCP).

alter table public.concurso_materias
  add column if not exists observacoes_estudo text not null default '';
