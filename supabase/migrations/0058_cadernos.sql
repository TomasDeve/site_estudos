-- 0058 — Cadernos impressos e onde o aluno parou em cada um.
-- Cada matéria do concurso tem um caderno em PDF (impresso). Aqui fica o total de
-- páginas, a última página estudada e a lista de capítulos com a página em que cada
-- um começa. A seção "Cadernos" mostra a porcentagem por matéria e, ao abrir, os
-- capítulos vistos, o em andamento e os que faltam.
-- O Claude atualiza `pagina_atual` quando o aluno conta até onde foi. Idempotente.

create table if not exists public.cadernos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  concurso_id uuid references public.concursos(id) on delete cascade,
  materia_id uuid references public.materias(id) on delete set null,
  titulo text not null default '',
  total_paginas integer not null check (total_paginas > 0),
  -- última página estudada até o fim (0 = não começou)
  pagina_atual integer not null default 0 check (pagina_atual >= 0),
  -- [{ "n": 1, "titulo": "...", "pagina": 8 }]: "pagina" = onde o capítulo começa;
  -- n nulo = seção sem número (simulado final, apêndice, extras)
  capitulos jsonb not null default '[]'::jsonb,
  -- aviso curto (ex.: caderno aposentado)
  observacao text not null default '',
  ordem integer not null default 0,
  atualizado_em timestamptz not null default now(),
  created_at timestamptz not null default now()
);

create index if not exists cadernos_user_concurso_idx
  on public.cadernos (user_id, concurso_id, ordem);

create or replace function public.cadernos_tocar_atualizado()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.pagina_atual is distinct from old.pagina_atual then
    new.atualizado_em := now();
  end if;
  return new;
end;
$$;

drop trigger if exists cadernos_atualizado on public.cadernos;
create trigger cadernos_atualizado
  before update on public.cadernos
  for each row execute function public.cadernos_tocar_atualizado();

alter table public.cadernos enable row level security;
drop policy if exists owner_all on public.cadernos;
create policy owner_all on public.cadernos
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
