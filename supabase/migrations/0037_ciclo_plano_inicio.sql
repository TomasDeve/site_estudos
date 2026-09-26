-- 0037 — Ciclo das matérias (Painel, logo abaixo do plano dos próximos dias).
-- A faixa mostra as matérias do edital, na ordem, pintadas conforme quantas
-- vezes já entraram no plano: cada bloco com a matéria sobe ela um nível, como
-- um ranking (cinza → verde → azul → roxo → dourado). "Novo ciclo" grava aqui a
-- data a partir da qual a contagem recomeça — por concurso e no banco, pra ser o
-- mesmo no PC e no celular. Nulo = conta o plano inteiro.
-- Idempotente. Rode no Supabase → SQL Editor.

alter table public.concursos
  add column if not exists ciclo_plano_inicio date;
