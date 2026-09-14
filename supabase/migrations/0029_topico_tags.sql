-- 0029 — Tags (etiquetas) por assunto + marcação "COMUM PCPE".
--
-- O assunto (tópico) é ÚNICO e compartilhado entre concursos. Uma "tag" é uma
-- etiqueta livre presa AO ASSUNTO (não ao concurso): serve para marcar, por
-- exemplo, que aquele assunto do edital da PC-AL também cai no edital de outro
-- concurso. É um array de textos ('{}' = sem etiqueta) e aparece como um selo
-- ao lado do nome do assunto na tela da matéria.
--
-- Esta migração:
--   1) cria a coluna `tags text[]` em `topicos`;
--   2) marca "COMUM PCPE" nos assuntos do edital da PC-AL cujo CONTEÚDO também é
--      cobrado no edital da PC-PE (comparação dos dois conteúdos programáticos).
--
-- Idempotente (o UPDATE mescla sem duplicar a tag, preservando outras que já
-- existam). Rode no Supabase → SQL Editor.

ALTER TABLE public.topicos
  ADD COLUMN IF NOT EXISTS tags text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN public.topicos.tags IS
  'Etiquetas livres do assunto (ex.: "COMUM PCPE" = também cai no edital da PC-PE). {} = nenhuma.';

-- "COMUM PCPE": assuntos da PC-AL que também constam no edital da PC-PE.
-- Agrupados por matéria (comentário) só para auditoria da comparação.
UPDATE public.topicos
SET tags = (SELECT array_agg(DISTINCT t) FROM unnest(array_append(tags, 'COMUM PCPE')) AS t)
WHERE id = ANY (ARRAY[
  -- Língua Portuguesa (idêntica nos dois editais) — 15
  '83aea925-fa43-4c51-9f9f-43518cf135c7', -- Compreensão e interpretação de textos
  'ffa9592b-0644-4e5c-8d1b-6e172b6b207c', -- Tipos e gêneros textuais
  '20dd81b6-0cef-4a55-8384-e9d042ddc393', -- Ortografia oficial
  '1a3c904c-3fd1-440e-9555-df63879305c2', -- Coesão
  '9728e7d8-79a4-43e0-b761-cfcfa6cb283a', -- Tempos e modos verbais
  '9117ed1a-940f-4c23-88c3-5d7b6cc9ec06', -- Estrutura morfossintática
  '87c2eddc-8091-45f1-a49d-b786e2602d1c', -- Classes de palavras
  '02e4e769-e14b-48f1-b1c8-471d9c7b1b20', -- Coordenação
  '93e67b9a-0170-495e-a83f-40c73b41c012', -- Subordinação
  'b2d95470-ec54-4f27-9e2f-c454306ec160', -- Pontuação
  '179903c9-b5ec-4980-800a-9bf2d0d495b7', -- Concordância
  'd1012677-b54d-45cf-b1db-895423147b47', -- Regência
  'e8560d8e-9be4-4220-aec9-624b66f8fd6f', -- Crase
  '273c5e15-0382-48cf-9098-4d674eec117b', -- Colocação pronominal
  'a0b0a7ba-a9a7-488d-9b80-4f1c6d6a53d3', -- Reescrita/significação

  -- TI e Segurança Cibernética (só a parte de Informática básica cai na PC-PE) — 5
  'f6ee0922-ead7-4389-8bab-525db4e1b7e5', -- Sistemas operacionais (Windows/Linux)
  '6828a0f6-b158-4302-8a30-65ed9fedc07c', -- Office; navegadores; correio; nuvem
  '43ae11dc-483f-4103-8af7-008bbef47fd0', -- Redes; Internet e intranet
  '2a61aaf9-59be-4422-a889-5cbcd233c0d2', -- Segurança: vírus, backup, antivírus
  '9b83947d-8406-4696-821b-1436fa2a72c5', -- Criptografia

  -- Raciocínio Lógico-Matemático (praticamente idêntico) — 12
  'c8171a77-a461-40f2-9609-e34b15bdb818', -- Operações com conjuntos
  '6af42b26-61b4-4d48-bf81-3ce3f716dccb', -- Porcentagens
  '2ef41625-e81c-4d13-82c6-ec50a8c36083', -- Lógica proposicional
  '62dd4aad-4382-450f-a51b-eed44b8db875', -- De Morgan e diagramas lógicos
  'ac61ad65-ff76-421f-9d4c-af90fa349564', -- Estruturas lógicas e argumentação
  'c002fc55-6fc0-4e26-ac35-fc2183202c9f', -- Lógica de primeira ordem
  'aae1eafe-4800-4851-bf1e-d8f44a86119a', -- Razões, proporções e regra de três
  '09926c5c-3bc6-4007-9fb1-dc759346b8c5', -- Contagem e probabilidade
  '863a940a-20fe-438c-ae26-d986ca2e973c', -- Equações 1º/2º grau; sequências
  '3c962765-eba9-49cb-a279-8bfa8bb367b5', -- PA e PG
  '25a0c347-2e3a-470e-bf58-5ebbc8728de3', -- Funções e gráficos
  'c3933c17-8131-4b99-9159-f2f01b2740b3', -- Problemas aritm./geom./matriciais

  -- Atualidades (PC-PE cobra só segurança pública, na discursiva) — 1
  'fec1647c-2cac-4b1d-9bd6-e1e7ccc7bdf8', -- Segurança pública e violência

  -- Direito Penal (todo o recorte da PC-AL está na PC-PE) — 7
  'da28a094-3f76-4780-8220-3ce6b225036b', -- Aplicação da lei penal
  '43b53a56-4bfd-4d5c-ba8c-5a85f53b57e1', -- Tempo/lugar do crime; lei temporária
  'b1fddc4e-6f49-472a-84ff-3233f453b1fe', -- Contagem de prazo; irretroatividade
  'd7a3b740-0199-4cf2-ac9f-e6484887ee02', -- Crimes contra a pessoa
  '027965e9-80f4-425c-a133-9eac58876733', -- Crimes contra o patrimônio
  'f4642ebf-13f1-4249-97a9-6725da54ab8a', -- Crimes contra a administração pública
  'aa34ef9c-1fd7-488f-bf27-b445491f6c6f', -- Disposições constitucionais (penal)

  -- Direito Processual Penal — 5
  'dcd9e258-0e0d-4d0b-a2a5-8c5cc06973eb', -- Disposições preliminares do CPP
  'a7913c53-f0db-4663-91b3-3bbcc6c69f35', -- Inquérito policial
  '619f8e54-fbbc-4cb2-84b0-4e2ae1bb6380', -- Prisão e liberdade provisória
  '3bd6b837-b802-4b0e-a656-a7e5d17abac8', -- Disposições constitucionais (proc. penal)
  '11c4e822-80f6-4067-864a-fe7f4c9ed726', -- Lei 9.099/1995 (JECrim)

  -- Direito Constitucional — 2
  'f32b6759-1838-4bf0-b35f-3c3c1a5e4937', -- Direitos e garantias fundamentais
  'c41b2b06-ae88-471b-967d-721412132b3b', -- Defesa do Estado; segurança pública

  -- Direito Administrativo (todo o recorte está na PC-PE) — 8
  'a2f860c7-befa-48c7-ab15-b459d056a207', -- Organização administrativa
  'a4ae1dc2-a7c8-47c0-9452-94ebe92e71ce', -- Atos administrativos
  '7334d45d-7257-410e-b794-eb3d25e93ef5', -- Agente público
  '758fe79d-1afe-4a06-bc8f-c4f7948f26f9', -- Poderes da administração
  '2e40dfef-ec74-486c-ae18-644af170cc0a', -- Licitações
  'a0690d23-62af-4eed-b3ca-58bc7ad94362', -- Controle da administração
  'd82d89bc-1ccf-4956-aab6-4b6d0fcf464d', -- Administração direta e indireta
  '17365ae6-3c59-4510-b6d8-a0191a048525', -- Responsabilidade civil do Estado

  -- Legislação Institucional de Alagoas (só a lei federal é comum) — 1
  'd62e76ba-1ea9-4b4c-8ab1-818c84420b00', -- Lei 10.826/2003 (Desarmamento)

  -- Legislação Penal Especial (leis que a PC-PE também cobra) — 7
  '4e1b59a7-f57f-497d-9fc8-0c9eb617f923', -- Abuso de autoridade (13.869/2019)
  '8fc936b4-a52b-45b1-84f7-20d4bf825cb3', -- Hediondos (8.072/1990)
  '2437831a-99a3-42f6-9760-be625a61f81a', -- Tortura (9.455/1997)
  '2eae2154-08fc-4d93-b62b-b101fb1ec192', -- Racismo (7.716/1989)
  '2b8de477-63ee-4b75-b794-a44814dd5fd3', -- Drogas (11.343/2006)
  '5fbccd98-241a-4ea2-a777-def6ca1afab0', -- Organização criminosa (12.850/2013)
  'b9ff9425-c077-4100-b36b-6a39f8a3f6b3', -- Crimes ambientais (9.605/1998)

  -- Contabilidade Geral (a base contábil é comum; finanças/tributos não) — 6
  '650b2289-2ca2-482e-b19a-1309de7f0460', -- Conceitos e finalidades
  '6ac2ab81-0893-418d-b864-138e3d9952a8', -- Patrimônio
  'e908823a-6f12-40df-b600-48bf7afb760b', -- Atos e fatos administrativos
  '095046c1-ab35-42ac-be8d-e9a45eef5be5', -- Contas, plano de contas
  'c1c2a7ef-8d24-4095-b498-56b240c6ba67', -- Balancete de verificação
  'f5cb0922-bd59-4828-b20a-a89f72e36a97', -- Balanço patrimonial e DRE

  -- Estatística (PC-PE só cobra descritiva, probabilidade e amostragem) — 4
  -- OBS.: esta matéria está RISCADA no seu edital da PC-AL.
  'bc0a14bb-e4ad-43b8-b6cf-377e83afed21', -- Estatística descritiva
  '65f1e7f6-2500-49ce-bad8-10407ada6f8f', -- Medidas de posição e dispersão
  'da06d6e4-d3d8-4363-a4ab-f51232520ad5', -- Probabilidade (condicional, Bayes)
  'b8d7b6f9-bf3a-4a52-9eb6-842b6112060f', -- TCL e técnicas de amostragem

  -- Crimes Cibernéticos (só a busca e apreensão do CPP é comum via Proc. Penal) — 1
  '572c8809-0cb7-4581-b5c9-8a2d57ec7fed'  -- Busca e apreensão (art. 240 e ss. CPP)
]::uuid[]);
