-- 0047 — Baterias de questões.
-- Uma bateria é uma prova (ou parte dela) separada para resolver de uma vez:
-- ex.: "TCE-MG 2026 · Português", as 10 questões na ordem da prova. Resolvida
-- no papel, a correção é na seção "Baterias" pelo mesmo número.
-- As questões continuam no caderno do assunto delas; a bateria só as agrupa
-- e numera, como a impressão faz com `imprimir_em`/`impressao_numero`.
-- Apagar a bateria não apaga as questões (o vínculo vira nulo).
-- Idempotente.

create table if not exists public.baterias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  nome text not null,
  -- de onde veio (ex.: "CESPE / CEBRASPE - 2026 - TCE-MG - Analista…"); null se não houver
  origem text,
  created_at timestamptz not null default now()
);

create index if not exists baterias_user_criado_idx
  on public.baterias (user_id, created_at desc);

alter table public.baterias enable row level security;
drop policy if exists owner_all on public.baterias;
create policy owner_all on public.baterias
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- A questão está em no máximo uma bateria, com o número que tem nela (o da prova).
alter table public.topico_questoes
  add column if not exists bateria_id uuid references public.baterias(id) on delete set null,
  add column if not exists bateria_numero integer;

create index if not exists topico_questoes_bateria_idx
  on public.topico_questoes (bateria_id, bateria_numero)
  where bateria_id is not null;
