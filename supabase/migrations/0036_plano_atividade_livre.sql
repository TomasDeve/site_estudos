-- 0036 — Bloco do plano com texto livre.
-- Nova atividade 'livre': em vez de escolher matéria/atividade, você escreve o
-- que vai fazer (ex.: "Revisão dos PDFs") — o texto fica em `nota` e vira o
-- título do bloco. Conta tempo de estudo como os outros (sem matéria).
-- Idempotente. Rode no Supabase → SQL Editor.

alter table public.plano_horas drop constraint if exists plano_horas_atividade_check;
alter table public.plano_horas
  add constraint plano_horas_atividade_check
  check (atividade in ('teoria', 'questoes', 'revisao', 'lei_seca', 'simulado', 'livre'));
