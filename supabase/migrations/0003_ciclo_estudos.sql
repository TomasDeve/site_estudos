-- Ciclo de Estudos: ordem de rodízio das matérias de um concurso.
-- O aluno estuda uma matéria por vez, marca como concluída e avança para a próxima.
-- Ao terminar todas, inicia uma nova "volta" (revisão do ciclo).
-- Convenção padrão: id uuid, user_id (dono, default auth.uid()) e created_at.
create table public.ciclo_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  concurso_id uuid not null references public.concursos(id) on delete cascade,
  materia_id uuid not null references public.materias(id) on delete cascade,
  ordem int not null default 0,
  concluido boolean not null default false,
  concluido_at timestamptz,
  voltas int not null default 0,
  created_at timestamptz not null default now(),
  unique (concurso_id, materia_id)
);

create index ciclo_itens_concurso_idx on public.ciclo_itens (concurso_id, ordem);
create index ciclo_itens_materia_idx on public.ciclo_itens (materia_id);

-- RLS: dono acessa tudo, mais ninguém (mesmo padrão das demais tabelas).
alter table public.ciclo_itens enable row level security;
create policy owner_all on public.ciclo_itens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
