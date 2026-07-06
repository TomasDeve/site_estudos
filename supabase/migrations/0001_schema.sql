-- Schema da plataforma "Meus Estudos"
-- Convenção: todas as tabelas têm id uuid, user_id (dono, default auth.uid()) e created_at.

create extension if not exists moddatetime with schema extensions;

create table public.concursos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug text not null,
  nome text not null,
  nome_curto text,
  orgao text,
  banca text,
  status text not null default 'ativo' check (status in ('ativo','futuro','arquivado')),
  icone text not null default '🎯',
  cor text not null default '#e0a83e',
  data_prova date,
  nota_data text,
  duracao_prova text,
  estrutura jsonb not null default '[]'::jsonb,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

-- Catálogo global por usuário: a matéria existe UMA vez, então o progresso
-- dos tópicos é automaticamente compartilhado entre concursos que a usam.
create table public.materias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  slug text not null,
  nome text not null,
  icone text not null default '📚',
  created_at timestamptz not null default now(),
  unique (user_id, slug)
);

create table public.topicos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  materia_id uuid not null references public.materias(id) on delete cascade,
  titulo text not null,
  ordem int not null default 0,
  status text not null default 'nao_estudado' check (status in ('nao_estudado','estudando','revisar','concluido')),
  created_at timestamptz not null default now()
);

create table public.concurso_materias (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  concurso_id uuid not null references public.concursos(id) on delete cascade,
  materia_id uuid not null references public.materias(id) on delete cascade,
  area text not null default 'P1' check (area in ('P1','P2','outros')),
  peso_questoes int,
  ordem int not null default 0,
  created_at timestamptz not null default now(),
  unique (concurso_id, materia_id)
);

create table public.topico_links (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  topico_id uuid not null references public.topicos(id) on delete cascade,
  titulo text not null,
  url text not null,
  tipo text not null default 'outro' check (tipo in ('questoes','aula','pdf','resumo','outro')),
  created_at timestamptz not null default now()
);

-- Meta de horas/dia válida em um intervalo de datas (pode haver várias faixas).
create table public.metas_periodo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data_inicio date not null,
  data_fim date not null,
  horas_dia numeric(4,2) not null check (horas_dia > 0),
  descricao text,
  created_at timestamptz not null default now(),
  check (data_fim >= data_inicio)
);

create table public.blocos_dia (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data date not null,
  titulo text not null,
  duracao_min int not null default 30 check (duracao_min > 0),
  materia_id uuid references public.materias(id) on delete set null,
  concurso_id uuid references public.concursos(id) on delete set null,
  concluido boolean not null default false,
  concluido_at timestamptz,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);

create table public.dias_concluidos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data date not null,
  horas_estudadas numeric(4,2),
  nota text,
  created_at timestamptz not null default now(),
  unique (user_id, data)
);

create table public.sessoes_estudo (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data date not null,
  minutos int not null check (minutos > 0),
  materia_id uuid references public.materias(id) on delete set null,
  concurso_id uuid references public.concursos(id) on delete set null,
  origem text not null default 'manual' check (origem in ('bloco','manual')),
  bloco_id uuid references public.blocos_dia(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.questao_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  data date not null,
  total int not null check (total > 0),
  acertos int not null,
  materia_id uuid references public.materias(id) on delete set null,
  materia_texto text,
  origem text not null default 'manual' check (origem in ('manual','import_qc')),
  created_at timestamptz not null default now(),
  check (acertos >= 0 and acertos <= total)
);

-- Memória do parser de importação: nome cru do Qconcursos -> matéria.
create table public.materia_aliases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  alias_normalizado text not null,
  materia_id uuid not null references public.materias(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (user_id, alias_normalizado)
);

create table public.eventos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  concurso_id uuid references public.concursos(id) on delete cascade,
  titulo text not null,
  tipo text not null default 'outro' check (tipo in ('prova','inscricao','revisao','outro')),
  data date not null,
  descricao text,
  concluido boolean not null default false,
  created_at timestamptz not null default now()
);

create table public.notas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text,
  conteudo text not null default '',
  fixada boolean not null default false,
  created_at timestamptz not null default now(),
  atualizado_em timestamptz not null default now()
);

create trigger notas_moddatetime
  before update on public.notas
  for each row execute function extensions.moddatetime(atualizado_em);

create table public.ferramentas (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null default auth.uid() references auth.users(id) on delete cascade,
  titulo text not null,
  url text not null,
  icone text,
  ordem int not null default 0,
  created_at timestamptz not null default now()
);
