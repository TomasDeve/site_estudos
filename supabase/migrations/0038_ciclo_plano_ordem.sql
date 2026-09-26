-- 0038 — Ordem do ciclo das matérias (Painel, abaixo do plano dos próximos dias).
-- O ciclo nasce na ordem do edital; arrastando as linhas, a ordem que você
-- escolheu é gravada aqui (ids das matérias, em sequência) — por concurso e no
-- banco, pra ser a mesma no PC e no celular. Nulo = ordem do edital.
-- Não mexe em concurso_materias.ordem (a ordem do edital, usada no resto do site).
-- Idempotente. Rode no Supabase → SQL Editor.

alter table public.concursos
  add column if not exists ciclo_plano_ordem uuid[];
