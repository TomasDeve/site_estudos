-- Revisão feita: acumulador do tempo de revisão (Anki) já registrado, abatido do
-- orçamento de revisão do concurso. Espelha, para a revisão, o que
-- topicos.horas_estudadas faz para o conteúdo — assim o balde "Revisão · Anki"
-- desce a cada registro, igual o de Conteúdo desce conforme os assuntos.
alter table public.concursos
  add column horas_revisao_feita numeric not null default 0 check (horas_revisao_feita >= 0);
