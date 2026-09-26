// Edge Function "tirar-duvida" — chat com IA sobre uma questão do caderno OU
// revisão do resumo do aluno. Recebe o contexto + histórico da conversa e
// devolve a resposta em streaming (texto puro, pedaço a pedaço).
//
// Segredo necessário (Dashboard → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY = chave da API da Anthropic
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface Payload {
  /** "resumir" = gera o trecho "Adicionar ao resumo" da questão; padrão é chat. */
  acao?: string;
  materia?: string | null;
  assunto?: string | null;
  questao?: {
    /** "ce" (Certo/Errado) ou "multipla". Ausente/legado = "ce". */
    tipo?: string | null;
    contexto?: string | null;
    enunciado: string;
    gabarito?: boolean | null;
    gabarito_letra?: string | null;
    alternativas?: { letra: string; texto: string }[] | null;
    comentario?: string | null;
    resposta?: boolean | null;
    resposta_letra?: string | null;
  };
  resumo?: { conteudo: string };
  mensagens: { role: "user" | "assistant"; content: string }[];
}

function erro(mensagem: string, status: number): Response {
  return new Response(mensagem, {
    status,
    headers: { ...CORS, "Content-Type": "text/plain; charset=utf-8" },
  });
}

function rotulo(v: boolean): string {
  return v ? "CERTO" : "ERRADO";
}

type QuestaoPayload = NonNullable<Payload["questao"]>;

function ehMultipla(q: QuestaoPayload): boolean {
  return q.tipo === "multipla";
}

/** Bloco "Alternativas:" para múltipla escolha; null em C/E. */
function alternativasTexto(q: QuestaoPayload): string | null {
  if (!ehMultipla(q) || !Array.isArray(q.alternativas)) return null;
  return q.alternativas.map((a) => `${a.letra}) ${a.texto}`).join("\n");
}

/** Descrição do gabarito para ambos os tipos. */
function gabaritoTexto(q: QuestaoPayload): string {
  if (ehMultipla(q)) {
    const alt = Array.isArray(q.alternativas)
      ? q.alternativas.find((a) => a.letra === q.gabarito_letra)
      : null;
    return alt
      ? `Alternativa ${q.gabarito_letra} — ${alt.texto}`
      : `Alternativa ${q.gabarito_letra ?? "?"}`;
  }
  return rotulo(!!q.gabarito);
}

/** O que o aluno respondeu e se acertou, para ambos os tipos. */
function situacaoTexto(q: QuestaoPayload): string {
  if (ehMultipla(q)) {
    if (!q.resposta_letra) return "O aluno ainda não respondeu este item.";
    const acertou = q.resposta_letra === q.gabarito_letra;
    return `O aluno marcou a alternativa ${q.resposta_letra} e ${acertou ? "ACERTOU" : "ERROU"}.`;
  }
  if (q.resposta === null || q.resposta === undefined) {
    return "O aluno ainda não respondeu este item.";
  }
  return `O aluno respondeu ${rotulo(q.resposta)} e ${
    q.resposta === q.gabarito ? "ACERTOU" : "ERROU"
  }.`;
}

const BASE =
  "Você é um professor particular preparando um candidato para o concurso de AGENTE DE POLÍCIA CIVIL DE PERNAMBUCO (PC PE, banca CEBRASPE). É um cargo de NÍVEL SUPERIOR; as provas objetivas são de itens Certo/Errado.";

const REGRAS_COMUNS = [
  "- Português do Brasil, tom de professor direto. Vá direto ao ponto.",
  "- Texto corrido, sem markdown (nada de asteriscos ou cerquilhas). Para listas curtas, use travessão (—) no começo da linha.",
  "- Não invente lei, número de artigo ou jurisprudência; se não tiver certeza, diga que não tem.",
];

// Edital do concurso-foco (PC PE — Agente de Polícia; conteúdo pelo edital de 2023, o
// de 2026 ainda não saiu). Serve para a IA saber o que o aluno precisa estudar, em que
// prova cada tema cai e o nível de cobrança — e, principalmente, responder com
// honestidade "isso pode cair na minha prova?". Espelha o recorte do aluno no site;
// ao mudar o foco, atualize só esta constante (e o BASE) e reimplante a função.
const EDITAL = [
  "EDITAL DO CANDIDATO — use isto para saber o que cai, em que prova cai e o nível da cobrança:",
  "",
  "Cargo: Agente de Polícia Civil de Pernambuco. Órgão: Polícia Civil de PE. Banca: CEBRASPE. Nível: SUPERIOR. O conteúdo segue o edital de 2023 (o de 2026 ainda não foi publicado).",
  "Estrutura: P1 objetiva (Certo/Errado) — Noções de Direito, 20 itens. P2 objetiva (Certo/Errado) — Conhecimentos Específicos, 40 itens. P3 discursiva — redação dissertativa sobre atualidades na área de segurança pública. Depois: exame médico, prova de capacidade física, avaliação psicológica, investigação social e curso de formação profissional.",
  "",
  "NOÇÕES DE DIREITO (P1):",
  "— Legislação Estadual de PE: Constituição do Estado de Pernambuco (arts. 101 a 105-B, segurança pública); Lei 6.425/1972 (Estatuto dos Policiais Civis de PE); Lei 6.123/1968 (Estatuto dos Servidores de PE); LC 137/2008 (Plano de Cargos, Carreiras e Vencimentos da Polícia Civil); LC 317/2015 (função de Delegado de Polícia Civil de PE).",
  "— Noções de Direito Constitucional: princípios fundamentais; poder constituinte originário, derivado e decorrente; aplicabilidade das normas constitucionais; direitos e garantias fundamentais; organização político-administrativa do Estado (União, estados, DF, municípios e territórios); administração pública (disposições gerais e servidores); Poderes Executivo, Legislativo e Judiciário; funções essenciais à justiça (MP, Advocacia Pública, Defensoria); defesa do Estado e das instituições democráticas; segurança pública na Constituição de PE.",
  "— Noções de Direito Administrativo: Estado, governo e administração pública; conceito de direito administrativo; ato administrativo; poderes (hierárquico, disciplinar, regulamentar e de polícia; uso e abuso do poder); regime jurídico-administrativo e princípios expressos e implícitos; responsabilidade civil do Estado; serviços públicos; organização administrativa (centralização, descentralização, concentração, desconcentração; administração direta e indireta); controle administrativo, judicial e legislativo; improbidade administrativa; processo administrativo; licitações e contratos; agente público; cargo, emprego e função.",
  "— Noções de Direito Penal: princípios; crime e contravenção; aplicação da lei penal (tempo e espaço, tempo e lugar do crime, lei excepcional/especial/temporária, territorialidade e extraterritorialidade, contagem de prazo, irretroatividade); crimes contra a pessoa, o patrimônio, a dignidade sexual e a administração pública; disposições constitucionais penais. Leis especiais (na P1 junto com o Penal): crimes hediondos (8.072/1990); racismo (7.716/1989); abuso de autoridade (13.869/2019); tortura (9.455/1997); ECA (8.069/1990); organização criminosa (12.850/2013); crimes de trânsito (CTB, 9.503/1997); Maria da Penha (11.340/2006); drogas (11.343/2006); Lei Henry Borel (14.344/2022, violência doméstica contra criança e adolescente); crimes ambientais (9.605/1998); Estatuto do Desarmamento (10.826/2003).",
  "— Noções de Direito Processual Penal: aplicação da lei processual no tempo, no espaço e em relação às pessoas; disposições preliminares do CPP; inquérito policial; provas (corpo de delito e perícias, interrogatório, confissão, ofendido, testemunhas, reconhecimento, acareação, documentos, indícios, busca e apreensão); prisão e liberdade provisória; medidas cautelares diversas da prisão; prisão temporária (7.960/1989); Juizados Especiais Criminais (9.099/1995); investigação criminal pelo delegado (12.830/2013); disposições constitucionais do processo penal.",
  "",
  "CONHECIMENTOS ESPECÍFICOS (P2):",
  "— Língua Portuguesa: compreensão e interpretação de textos; tipos e gêneros textuais; ortografia; coesão (referenciação, conectores, sequenciação); tempos e modos verbais; morfossintaxe do período; classes de palavras; coordenação e subordinação; pontuação; concordância verbal e nominal; regência verbal e nominal; crase; colocação pronominal; reescrita de frases e parágrafos; correspondência oficial (Manual de Redação da Presidência da República).",
  "— Informática: Windows (janelas, pastas e arquivos, configurações, Explorer); Word, Excel (fórmulas, funções, referências, gráficos) e PowerPoint; redes, Internet e intranet; grupos de discussão e redes sociais; computação e armazenamento em nuvem; navegadores; deep web e dark web; correio eletrônico; busca na Internet; segurança (acessos, programas maliciosos, antivírus, criptografia); backup.",
  "— Raciocínio Lógico: conjuntos numéricos; sistema legal de medidas; razões e proporções, divisão proporcional, regra de três simples e composta, porcentagem; equações e inequações de 1º e 2º graus; sistemas lineares; funções e gráficos; princípios de contagem e probabilidade; PA e PG; estruturas lógicas e lógica de argumentação; lógica proposicional (tabelas-verdade, equivalências, De Morgan, diagramas); lógica de primeira ordem; operações com conjuntos; problemas aritméticos, geométricos e matriciais.",
  "— Contabilidade Geral: conceitos, objetivos e finalidades; patrimônio e equação fundamental; atos e fatos administrativos; contas e plano de contas; escrituração (lançamentos, livros, regimes de competência e de caixa); contabilização de operações diversas; balancete de verificação; balanço patrimonial; DRE; Normas Brasileiras de Contabilidade.",
  "— Estatística: estatística descritiva e análise exploratória (gráficos, tabelas, medidas de posição, dispersão, assimetria e curtose); probabilidade (axiomas, condicional, independência); técnicas de amostragem (aleatória simples, estratificada, sistemática, por conglomerados) e tamanho amostral.",
  "",
  "DISCURSIVA (P3): redação dissertativa sobre tópicos relevantes e atuais na área de segurança pública.",
  "",
  "FORA DO FOCO: o candidato largou por ora o PC AL (Escrivão) — Direitos Humanos, Ética no Serviço Público, Legislação Institucional de Alagoas, Crimes Cibernéticos, contabilidade avançada/análise financeira e ciência de dados NÃO estão no edital da PC PE; não puxe o estudo para lá. A prova também NÃO é de Soldado da PMAL nem de Escrivão/Delegado: ignore qualquer contexto antigo nesse sentido.",
  "",
  "COMO USAR ISTO: quando o aluno perguntar se um tema pode cair, responda pelo edital acima — diga em qual matéria e em qual prova (P1, P2 ou P3) o tema se encaixa, ou diga com honestidade que está fora do edital dele. Um ponto fundamental ou diretamente vizinho a uma matéria listada pode aparecer mesmo sem estar escrito com todas as letras; sinalize quando for o caso. Nunca afirme que algo cai sem ter certeza.",
].join("\n");

function systemQuestao(p: Payload): string {
  const q = p.questao!;
  return [
    `${BASE} O aluno está resolvendo questões e abriu um chat para tirar dúvida sobre O ITEM ABAIXO.`,
    "",
    p.materia ? `Matéria: ${p.materia}` : null,
    p.assunto ? `Assunto: ${p.assunto}` : null,
    q.contexto ? `Comando da questão: ${q.contexto}` : null,
    `${ehMultipla(q) ? "Enunciado" : "Item"}: ${q.enunciado}`,
    alternativasTexto(q) ? `Alternativas:\n${alternativasTexto(q)}` : null,
    `Gabarito: ${gabaritoTexto(q)}`,
    situacaoTexto(q),
    q.comentario ? `Comentário do gabarito: ${q.comentario}` : null,
    "",
    EDITAL,
    "",
    "Regras da resposta:",
    "- Na maioria das vezes, 2 a 6 frases bastam.",
    ...REGRAS_COMUNS,
    "- Foque no que derruba candidato na prova: pegadinhas, troca de termos, prazos, autoridades competentes, exceções.",
    "- Se o aluno errou, aponte onde o raciocínio dele provavelmente escorregou.",
    "- Quando couber, feche com um macete curto ou com o jeito que a banca costuma cobrar o tema.",
  ]
    .filter((linha) => linha !== null)
    .join("\n");
}

function systemResumirQuestao(p: Payload): string {
  const q = p.questao!;
  return [
    `${BASE} O aluno acabou de responder o item abaixo e quer ADICIONAR AO RESUMO dele o núcleo desse aprendizado, de forma esquematizada para revisar depois.`,
    "",
    p.materia ? `Matéria: ${p.materia}` : null,
    p.assunto ? `Assunto: ${p.assunto}` : null,
    q.contexto ? `Comando da questão: ${q.contexto}` : null,
    `${ehMultipla(q) ? "Enunciado" : "Item"}: ${q.enunciado}`,
    alternativasTexto(q) ? `Alternativas:\n${alternativasTexto(q)}` : null,
    `Gabarito: ${gabaritoTexto(q)}`,
    q.comentario ? `Comentário do gabarito: ${q.comentario}` : null,
    "",
    "Monte um esquema ORGANIZADO e objetivo para colar no resumo: o NÚCLEO da questão em destaque e, à volta, os pontos vizinhos que caem junto com esse tema — sempre AGRUPADOS por assunto, nunca uma lista solta de fatos avulsos. Responda SOMENTE com o esquema — sem preâmbulo, sem repetir o enunciado, sem citar \"a questão\", \"o item\" ou \"o gabarito\", sem comentar o acerto ou o erro do aluno.",
    "Escreva o CONTEÚDO EM SI — a matéria objetiva, como num resumo de estudo limpo. NÃO descreva pegadinha nem armadilha, NÃO explique \"como a banca cobra\", \"o que a banca troca\", \"onde o candidato erra\", e NÃO traga comparações que a banca costuma fazer, dicas de prova ou alertas. Só o conceito, a regra, o rol — direto.",
    "Estrutura, com uma LINHA EM BRANCO entre o núcleo e cada grupo:",
    "",
    "Parte 1 — Núcleo: a PRIMEIRA linha, começando com a seta \"→ \" (não escreva a palavra \"núcleo\"). É a regra/conceito EXATO que este item cobrou. Havendo base legal segura, cite o artigo entre parênteses. Deixe em CAIXA ALTA as 2 ou 3 palavras-chave decisivas (o termo exato, o prazo, a autoridade).",
    "Parte 2 — Em volta (o que cai junto): traga os pontos vizinhos que o aluno precisa fixar com este tema — a classificação a que o núcleo pertence, o ROL de casos/hipóteses/requisitos do instituto, o instituto irmão diretamente relacionado. AGRUPE por assunto: cada grupo começa com um RÓTULO curto terminando em dois-pontos, numa linha só (ex.: \"Extraterritorialidade incondicionada (art. 7º, I):\"), e logo abaixo cada item numa linha começando com travessão \"— \". Quando o grupo for uma lista fechada (os casos, as hipóteses, os requisitos), traga TODOS os itens dela. Use no MÁXIMO 2 rótulos e só o que é DIRETAMENTE vizinho ao núcleo — nada de desviar para temas que não se conectam. Se não há nada estruturado em volta, encerre no núcleo.",
    "",
    "Só esquema, sem frases de ligação nem enrolação. Português do Brasil. Sem markdown (nada de asteriscos, cerquilhas ou numeração — o rótulo é texto normal terminando em dois-pontos). Não invente lei, artigo, caso nem jurisprudência: se não souber o rol completo com segurança, traga só os itens que tem certeza ou omita o grupo.",
  ]
    .filter((linha) => linha !== null)
    .join("\n");
}

function systemResumo(p: Payload): string {
  // Limite defensivo: resumo gigante não deve estourar o prompt.
  const conteudo = p.resumo!.conteudo.slice(0, 12000);
  return [
    `${BASE} O aluno escreveu um RESUMO próprio enquanto resolvia questões e pediu que você o revise.`,
    "",
    p.materia ? `Matéria: ${p.materia}` : null,
    p.assunto ? `Assunto: ${p.assunto}` : null,
    "Resumo do aluno (entre as tags):",
    "<resumo>",
    conteudo,
    "</resumo>",
    "",
    EDITAL,
    "",
    "Regras da resposta:",
    ...REGRAS_COMUNS,
    "- O MAIS IMPORTANTE: aponte erros de conteúdo (conceito trocado, prazo errado, autoridade errada, lei desatualizada) e dê a correção direta de cada um.",
    "- Depois, diga o que falta de essencial para a prova sobre esse tema, em lista curta.",
    "- Sugira melhorias de organização/clareza só quando realmente ajudarem a memorizar.",
    "- Se estiver tudo certo, diga isso claramente e reforce os 2 ou 3 pontos-chave do tema.",
    "- Resposta enxuta: revisão útil, não redação nova. Não reescreva o resumo inteiro, a menos que o aluno peça.",
  ]
    .filter((linha) => linha !== null)
    .join("\n");
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return erro("Use POST.", 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return erro(
      "ANTHROPIC_API_KEY não configurada nos segredos das Edge Functions.",
      500,
    );
  }

  let payload: Payload;
  try {
    payload = await req.json();
  } catch {
    return erro("Corpo inválido: envie JSON.", 400);
  }

  const temResumo = !!payload.resumo?.conteudo?.trim();
  const temQuestao = !!payload.questao?.enunciado;
  if ((!temResumo && !temQuestao) || !Array.isArray(payload.mensagens)) {
    return erro("Envie `questao` ou `resumo`, e `mensagens`.", 400);
  }

  // Só as últimas trocas — mantém o prompt curto e a resposta rápida.
  const mensagens = payload.mensagens
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content?.trim())
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content }));
  if (mensagens.length === 0 || mensagens[mensagens.length - 1].role !== "user") {
    return erro("A última mensagem precisa ser do aluno.", 400);
  }

  const resumirQuestao = payload.acao === "resumir" && temQuestao;
  const system = resumirQuestao
    ? systemResumirQuestao(payload)
    : temResumo
      ? systemResumo(payload)
      : systemQuestao(payload);

  const client = new Anthropic({ apiKey });

  // Opus 4.8 sem thinking (padrão ao omitir) + streaming: primeira palavra
  // chega rápido e o aluno não perde o ritmo. O trecho de resumo é enxuto de
  // propósito — 800 tokens dão folga para o núcleo + os grupos sem truncar.
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: resumirQuestao ? 800 : 1600,
    output_config: { effort: "low" },
    system,
    messages: mensagens,
  });

  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    async start(controller) {
      try {
        for await (const evento of stream) {
          if (
            evento.type === "content_block_delta" &&
            evento.delta.type === "text_delta"
          ) {
            controller.enqueue(encoder.encode(evento.delta.text));
          }
        }
      } catch (err) {
        const msg = err instanceof Error ? err.message : String(err);
        controller.enqueue(encoder.encode(`\n\n[Erro na IA: ${msg}]`));
      }
      controller.close();
    },
    cancel() {
      stream.abort();
    },
  });

  return new Response(body, {
    headers: {
      ...CORS,
      "Content-Type": "text/plain; charset=utf-8",
      "X-Content-Type-Options": "nosniff",
      "Cache-Control": "no-store",
    },
  });
});
