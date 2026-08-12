-- Sistema de horas: liga a camada de horas por concurso e conecta o tempo real
-- estudado ao orçamento por assunto. Cada assunto passa a ter "horas estudadas"
-- (o tempo registrado é descontado do alvo), e a sessão de estudo pode apontar
-- para o assunto que foi estudado — histórico e desconto no mesmo lugar.

-- Interruptor por concurso: mostra/esconde toda a camada de horas.
alter table public.concursos
  add column sistema_horas boolean not null default false;

-- Horas já estudadas de cada assunto (o tempo registrado é abatido do alvo).
alter table public.topicos
  add column horas_estudadas numeric not null default 0 check (horas_estudadas >= 0);

-- Sessão de estudo pode apontar para o assunto estudado (nulo = tempo geral da
-- matéria, ex.: "Todos" repartido entre vários assuntos).
alter table public.sessoes_estudo
  add column topico_id uuid references public.topicos(id) on delete set null;

create index if not exists sessoes_estudo_topico_idx on public.sessoes_estudo (topico_id);

-- Quem já vinha usando o orçamento de horas continua vendo tudo: liga o sistema
-- nos concursos que já têm horas definidas em qualquer nível da cascata.
update public.concursos c
set sistema_horas = true
where c.horas_conteudo > 0
   or c.horas_revisao > 0
   or exists (
     select 1 from public.concurso_materias m
     where m.concurso_id = c.id and m.horas_alvo > 0
   );
