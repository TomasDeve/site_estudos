-- 0045 — Treino de parágrafos de redação (/paragrafos). Cada linha é UM parágrafo
-- escrito no site (introdução, desenvolvimento ou conclusão) sobre um tema sorteado
-- do banco do site (src/features/paragrafos/temas.json), já corrigido pela IA
-- (edge function corrigir-paragrafo).
--   tema_id   id do tema no temas.json (ex.: 'b03a', 'e1');
--   aspecto   0, 1 ou 2 = qual aspecto da proposta o parágrafo responde (null na introdução);
--   nota      0 a 10 = nota_conteudo − 2·erros/linhas (a conta da Cebraspe, em escala 10);
--   correcao  o JSON inteiro que a IA devolveu (critérios, acertos, erros, reescrita).
-- Idempotente.

create table if not exists public.redacao_paragrafos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  tipo text not null check (tipo in ('introducao', 'desenvolvimento', 'conclusao')),
  tema_id text not null,
  aspecto smallint check (aspecto between 0 and 2),
  texto text not null,
  linhas smallint not null default 0,
  segundos integer,
  conceito smallint check (conceito between 0 and 3),
  nota_conteudo numeric(4, 2),
  erros smallint not null default 0,
  nota numeric(4, 2),
  correcao jsonb,
  created_at timestamptz not null default now()
);

create index if not exists redacao_paragrafos_user_criado_idx
  on public.redacao_paragrafos (user_id, created_at desc);

alter table public.redacao_paragrafos enable row level security;
drop policy if exists owner_all on public.redacao_paragrafos;
create policy owner_all on public.redacao_paragrafos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
