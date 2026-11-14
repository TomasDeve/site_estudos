-- 0050 — Revisão semanal (revisão ativa do que foi visto na semana).
-- No fim da semana o aluno manda as páginas dos cadernos que estudou. O Claude acha
-- onde ele errou ou ficou em dúvida e monta premissas diretas (Certo/Errado) sobre
-- esses pontos. No site ele escolhe a matéria e responde uma por vez; depois de
-- responder aparece a explicação do caderno, a observação do Claude e, se houver,
-- uma imagem. Quem cria os itens é a skill revisao-semanal (service key).
-- Idempotente.

create table if not exists public.revisao_semanal_itens (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  -- segunda-feira da semana de estudo a que a revisão se refere
  semana date not null,
  materia_id uuid not null references public.materias(id) on delete cascade,
  ordem integer not null default 0,
  -- assunto curto da premissa (ex.: "Distributiva", "Autarquias")
  tema text,
  -- de onde veio no caderno (ex.: "Caderno p. 89 · questão 95")
  origem text,
  -- por que entrou: errou a questão, ficou em dúvida ou reforço pedido por ele
  motivo text not null default 'erro' check (motivo in ('erro', 'duvida', 'reforco')),
  premissa text not null,
  -- true = Certo
  gabarito boolean not null,
  -- a explicação como está no caderno
  explicacao text not null,
  -- observação do Claude que complementa o caderno (opcional)
  complemento text,
  -- imagem que ajuda a lembrar (URL pública do bucket revisao-imagens)
  imagem_url text,
  resposta boolean,
  respondida_em timestamptz,
  created_at timestamptz not null default now()
);

create index if not exists revisao_semanal_itens_user_semana_idx
  on public.revisao_semanal_itens (user_id, semana desc, materia_id, ordem);

alter table public.revisao_semanal_itens enable row level security;
drop policy if exists owner_all on public.revisao_semanal_itens;
create policy owner_all on public.revisao_semanal_itens
  for all to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Imagens das premissas: bucket público, só leitura no site (quem sobe é a skill).
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'revisao-imagens', 'revisao-imagens', true, 5242880,
  array['image/jpeg', 'image/png', 'image/webp']
)
on conflict (id) do update
  set public = excluded.public,
      file_size_limit = excluded.file_size_limit,
      allowed_mime_types = excluded.allowed_mime_types;
