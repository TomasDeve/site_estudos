-- Questões por IA dentro de cada assunto (tópico): itens no estilo da banca
-- (certo/errado) gerados a partir do material de aula, com comentário do gabarito.
-- Depois de resolver, o aluno decide o destino do item: deixa ativo, salva para
-- revisão, arquiva ou apaga.

create table public.topico_questoes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topico_id uuid not null references public.topicos(id) on delete cascade,
  contexto text,                       -- comando/texto-base da banca (opcional)
  enunciado text not null,             -- o item a ser julgado
  gabarito boolean not null,           -- true = Certo, false = Errado
  comentario text not null default '',
  fonte text,                          -- material de origem (ex.: "Aula 01 — Colonização portuguesa")
  status text not null default 'ativa' check (status in ('ativa','revisar','arquivada')),
  resposta boolean,                    -- última resposta do aluno; null = ainda não resolvida
  respondida_em timestamptz,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create index topico_questoes_topico_idx on public.topico_questoes (user_id, topico_id, ordem);
create index topico_questoes_topico_fk_idx on public.topico_questoes (topico_id);

alter table public.topico_questoes enable row level security;
create policy owner_all on public.topico_questoes
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
