-- Vincula um registro de questões a um tópico (assunto) específico, além da matéria.
-- Permite acompanhar o desempenho por assunto direto no edital verticalizado.
alter table public.questao_logs
  add column topico_id uuid references public.topicos(id) on delete set null;

create index questao_logs_topico_idx on public.questao_logs (topico_id);
