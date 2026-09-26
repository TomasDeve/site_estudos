-- 0034 — Plano dos 6 dias em blocos de meia hora.
-- A coluna `hora` passa a ser a posição do bloco de 30 min no dia (1º, 2º, …):
-- o dia começa com 6 blocos (3h) e dá para acrescentar mais. Troca o teto de
-- 5 (horas) por 16 blocos (8h).
-- Idempotente. Rode no Supabase → SQL Editor.

alter table public.plano_horas drop constraint if exists plano_horas_hora_check;
alter table public.plano_horas
  add constraint plano_horas_hora_check check (hora between 1 and 16);
