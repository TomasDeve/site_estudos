-- 0044 — Onde cada questão do "Adicionar ao resumo" está em relação ao Anki, pro
-- celular do resumo pintar cada uma (já no Anki × falta). Uma linha por questão:
--   status 'no_anki'   a questão já virou card;
--          'ignorada'  não vai pro Anki (decisão sua) — sai da conta do que falta.
--   origem 'importacao' a skill /importar-site-anki gravou (ou ignorou) a questão;
--          'anki'       o Q##### foi achado num card ativo do Anki;
--          'site'       marcada à mão no celular do resumo.
-- Sem linha = ainda não está no Anki (falta). O registro local da skill
-- (estado/importadas.json) continua valendo; esta tabela é o espelho que o site lê,
-- em qualquer aparelho. Idempotente.

create table if not exists public.questoes_anki (
  questao_id uuid primary key references public.topico_questoes(id) on delete cascade,
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  status text not null check (status in ('no_anki', 'ignorada')),
  origem text not null default 'site' check (origem in ('importacao', 'anki', 'site')),
  em timestamptz not null default now()
);

create index if not exists questoes_anki_user_id_idx on public.questoes_anki (user_id);

alter table public.questoes_anki enable row level security;
drop policy if exists owner_all on public.questoes_anki;
create policy owner_all on public.questoes_anki
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Quantas questões do "Resumo das questões" ainda faltam ir pro Anki — o numerozinho
-- do menu e do botão do celular, sem baixar os resumos inteiros. Mesma regra do
-- celular (src/features/resumo/itensResumo.ts): conta a questão que existe, não tem
-- linha aqui e cai no edital de algum concurso ativo (matéria não riscada, assunto no
-- recorte e não riscado). Sem concurso ativo, não filtra pelo edital.
create or replace function public.resumo_anki_faltam()
returns integer
language sql
stable
security invoker
set search_path = public
as $$
  with blocos as (
    select distinct m[1] as qid
    from public.topico_textos t,
      lateral regexp_matches(
        t.conteudo,
        'data-resumo-questao="([0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12})"',
        'g'
      ) as m
    where t.titulo = 'Resumo das questões'
  ),
  ativos as (
    select id from public.concursos where status = 'ativo'
  )
  select count(*)::integer
  from blocos b
  join public.topico_questoes q on q.id = b.qid::uuid
  join public.topicos tp on tp.id = q.topico_id
  where not exists (select 1 from public.questoes_anki a where a.questao_id = q.id)
    and (
      not exists (select 1 from ativos)
      or exists (
        select 1
        from public.concurso_materias cm
        join ativos c on c.id = cm.concurso_id
        where cm.materia_id = tp.materia_id
          and not cm.riscada
          and (cm.topicos_incluidos is null or tp.id = any (cm.topicos_incluidos))
          and not (tp.id = any (coalesce(cm.topicos_riscados, '{}')))
      )
    );
$$;

grant execute on function public.resumo_anki_faltam() to authenticated;
