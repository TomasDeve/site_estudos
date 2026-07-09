-- Linha divisória opcional após um assunto: permite agrupar visualmente os
-- tópicos que fazem sentido estudar juntos (ex.: Princípios + Regime jurídico).
-- A divisória fica no próprio tópico, então acompanha a matéria em todos os
-- concursos que a usam.

alter table public.topicos
  add column separador_apos boolean not null default false;
