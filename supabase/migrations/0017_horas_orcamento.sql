-- Camada de planejamento de horas (orçamento), à parte do tempo real estudado
-- (sessoes_estudo). Em cascata: o total do concurso divide-se em conteúdo e
-- revisão (Anki); as horas de conteúdo são repartidas entre as matérias; e as
-- horas de cada matéria, entre os assuntos.

alter table public.concursos
  add column horas_conteudo numeric not null default 0 check (horas_conteudo >= 0),
  add column horas_revisao  numeric not null default 0 check (horas_revisao  >= 0);

-- Matéria (por concurso): horas alocadas para a matéria.
alter table public.concurso_materias
  add column horas_alvo numeric not null default 0 check (horas_alvo >= 0);

-- Tópico/assunto: horas alocadas para o assunto.
alter table public.topicos
  add column horas_alvo numeric not null default 0 check (horas_alvo >= 0);
