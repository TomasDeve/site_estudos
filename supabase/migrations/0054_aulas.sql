-- 0054 — Aulas para assistir no tempo livre.
-- O aluno guarda links de aulas (YouTube ou qualquer site), separa por matéria,
-- anota onde parou (em segundos) e marca como concluída. No YouTube, o
-- "Continuar" abre o vídeo já no ponto em que ele parou.
-- Tabela global (não presa a concurso). Idempotente.

create table if not exists public.aulas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- matéria da aula; nula = "Sem matéria"
  materia_id uuid references public.materias(id) on delete set null,
  titulo text not null default '',
  url text not null,
  -- onde parou (segundos desde o começo do vídeo)
  parei_seg integer not null default 0 check (parei_seg >= 0),
  concluida boolean not null default false,
  concluida_em timestamptz,
  ordem integer not null default 0,
  created_at timestamptz not null default now()
);

create index if not exists aulas_user_materia_idx
  on public.aulas (user_id, materia_id, concluida, ordem);

alter table public.aulas enable row level security;
drop policy if exists owner_all on public.aulas;
create policy owner_all on public.aulas
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
