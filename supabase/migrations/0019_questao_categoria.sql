-- Categoria/origem da questão dentro do caderno de IA. Serve de filtro no caderno
-- (cada categoria é um "sub-caderno") e diz de que fonte a IA gerou o item:
--   doutrina_jurisprudencia — a partir de doutrina e jurisprudência;
--   baseada_questoes        — modelada em questões reais de prova;
--   ia                      — criada pela IA a partir do conteúdo do assunto.
-- Tudo que já existe é da IA a partir do conteúdo, então o default backfilla 'ia'.

alter table public.topico_questoes
  add column categoria text not null default 'ia'
    check (categoria in ('doutrina_jurisprudencia', 'baseada_questoes', 'ia'));
