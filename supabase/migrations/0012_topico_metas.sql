-- Metas por assunto (tópico): a checklist que define quando um assunto pode ser
-- dado como concluído. O plano padrão tem 5 metas — duas marcadas na mão (ler a
-- lei, produzir resumo/flashcards) e três calculadas sozinhas pelo histórico de
-- questões do assunto (volume, taxa de acerto e teste frio).
--
-- Como os três números são lidos em cada tipo:
--   volume  → alvo = questões (20), dias = dias distintos mínimos (2)
--   acerto  → alvo = % de acerto (85), janela = últimas N questões (20)
--   frio    → alvo = % de acerto (80), janela = tamanho do bloco (10),
--             dias = lacuna sem tocar no assunto que "esfria" o conteúdo (7)
--   manual  → os três ficam nulos; vale o que o aluno marcar

create table public.topico_metas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topico_id uuid not null references public.topicos(id) on delete cascade,
  chave text not null,                 -- 'lei','producao','volume','acerto','frio' ou livre
  titulo text not null,
  tipo text not null default 'manual' check (tipo in ('manual','volume','acerto','frio')),
  alvo numeric,
  janela int,
  dias int,
  concluida boolean not null default false,  -- manual: é a verdade. Automática: "dar por cumprida"
  concluida_at timestamptz,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, topico_id, chave)
);

create index topico_metas_topico_idx on public.topico_metas (user_id, topico_id, ordem);
create index topico_metas_topico_fk_idx on public.topico_metas (topico_id);

alter table public.topico_metas enable row level security;
create policy owner_all on public.topico_metas
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));
