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
  "Você é um professor particular preparando um candidato para o concurso de ESCRIVÃO DE POLÍCIA CIVIL DE ALAGOAS (PC AL 2026, banca CEBRASPE). É um cargo de NÍVEL SUPERIOR; as provas objetivas são de itens Certo/Errado.";

const REGRAS_COMUNS = [
  "- Português do Brasil, tom de professor direto. Vá direto ao ponto.",
  "- Texto corrido, sem markdown (nada de asteriscos ou cerquilhas). Para listas curtas, use travessão (—) no começo da linha.",
  "- Não invente lei, número de artigo ou jurisprudência; se não tiver certeza, diga que não tem.",
];

// Edital do concurso-foco (PC AL 2026 — Escrivão). Serve para a IA saber o que o
// aluno precisa estudar, em que prova cada tema cai e o nível de cobrança — e,
// principalmente, responder com honestidade "isso pode cair na minha prova?".
// Espelha o recorte do aluno no site; ao mudar o foco, atualize só esta constante.
const EDITAL = [
  "EDITAL DO CANDIDATO — use isto para saber o que cai, em que prova cai e o nível da cobrança:",
  "",
  "Cargo: Escrivão de Polícia Civil de Alagoas. Órgão: Polícia Civil de AL. Banca: CEBRASPE. Nível: SUPERIOR. Prova prevista para 06/12/2026.",
  "Estrutura: P1 objetiva (Certo/Errado) — Conhecimentos Básicos, 50 itens. P2 objetiva (Certo/Errado) — Conhecimentos Específicos, 70 itens. P3 discursiva — redação sobre atualidades (até 30 linhas). Depois: prova prática de digitação (própria do escrivão), teste de capacidade física, exames, avaliação psicológica, investigação social e curso de formação.",
  "",
  "CONHECIMENTOS BÁSICOS (P1):",
  "— Língua Portuguesa: compreensão e interpretação de textos; tipos e gêneros textuais; ortografia; coesão (referenciação, conectores, sequenciação); tempos e modos verbais; morfossintaxe do período; classes de palavras; coordenação e subordinação; pontuação; concordância verbal e nominal; regência verbal e nominal; crase; colocação pronominal; reescrita de frases e parágrafos.",
  "— Raciocínio Lógico-Matemático: conjuntos; porcentagem; leis de De Morgan e diagramas lógicos; contagem e probabilidade; razão, proporção e regra de três; equações de 1º e 2º grau e sequências; PA e PG; funções e gráficos; lógica proposicional (tabelas-verdade, equivalências) e de argumentação; lógica de 1ª ordem; problemas aritméticos, geométricos e matriciais.",
  "— TI e Segurança Cibernética: sistemas operacionais (Linux e Windows); Office, navegadores, Outlook e nuvem; redes, Internet e intranet; segurança da informação (vírus, worms, backup, antivírus, firewall); tripé confidencialidade/integridade/disponibilidade; criptografia, assinatura e certificação digital; banco de dados, SQL e SGBD; gestão de identidade e acesso (SSO, SAML, OAuth2, OpenID); ataques, vulnerabilidades e tratamento de incidentes; frameworks MITRE, CIS e NIST CSF, SIEM/IAM/PAM; LGPD; linguagens de programação; gestão de riscos; segurança de rede (firewall, IDS/IPS, VPN, segmentação).",
  "— Direitos Humanos: teoria geral; Convenção Americana (Pacto de São José, Decreto 678/1992); afirmação histórica e evolução; sistema de proteção e Política Nacional de Direitos Humanos; DH na Constituição Federal; responsabilidade do Estado.",
  "— Ética no Serviço Público: ética e moral, princípios e valores; cidadania; ética na função pública; Lei estadual 6.754/2006 (Código de Ética Funcional do servidor de AL).",
  "— Atualidades (base da redação P3): segurança pública e violência; política e economia; sociedade, educação e saúde; tecnologia e energia; meio ambiente e desenvolvimento sustentável.",
  "",
  "CONHECIMENTOS ESPECÍFICOS (P2):",
  "— Direito Penal: aplicação da lei penal (princípios, lei no tempo e no espaço, tempo e lugar do crime, lei excepcional/especial/temporária, contagem de prazo, irretroatividade); crimes contra a pessoa; crimes contra o patrimônio; crimes contra a administração pública; disposições constitucionais penais.",
  "— Direito Processual Penal: inquérito policial; disposições preliminares do CPP; prisão em flagrante, temporária e preventiva e liberdade provisória; disposições constitucionais do processo penal; Lei 9.099/1995 (JECRIM). (Ação penal está fora do recorte do candidato.)",
  "— Direito Constitucional: direitos e garantias fundamentais; defesa do Estado e segurança pública (art. 144). (Organização do Estado e organização dos Poderes estão fora do recorte.)",
  "— Direito Administrativo: administração direta e indireta; poderes da administração; atos administrativos; controle da administração; responsabilidade civil do Estado; licitações; organização administrativa (centralização, descentralização, desconcentração); agente público. (LIMPE, regime jurídico administrativo, bens públicos, serviço público e contratos administrativos estão fora do recorte.)",
  "— Legislação Institucional de Alagoas: Estatuto do Desarmamento (Lei 10.826/2003); Constituição do Estado de Alagoas; Estatuto da Polícia Civil de AL (Lei estadual 3.437/1975); Regime Jurídico Único dos servidores de AL (Lei 5.247/1991); Lei Orgânica Nacional das Polícias Civis (Lei 14.735/2026); leis estaduais 6.441/2003, 6.276/2001, 6.479/2004 e 4.590/1984.",
  "— Legislação Penal Especial: racismo (Lei 7.716/1989); crimes hediondos (8.072/1990 e 8.930/1994); tortura (9.455/1997); abuso de autoridade (13.869/2019); organização criminosa (12.850/2013); crimes ambientais (9.605/1998); drogas (11.343/2006); crimes contra as finanças públicas; Sistema Financeiro Nacional (7.492/1986); ordem econômica e tributária (8.137/1990); lavagem de dinheiro (9.613/1998); ordem econômica (8.176/1991); crimes de responsabilidade (DL 201/1967 e Lei 1.079/1950); crimes em licitações e contratos (14.133/2021); Convenção de Budapeste (Decreto 11.491/2023); Estatuto da Pessoa com Deficiência (13.146/2015) e do Idoso (10.741/2003); crimes falimentares (11.101/2005). (Fora do recorte: CP Parte Geral Títulos I a III, Maria da Penha, CTB, ECA, prisão temporária 7.960/1989 e juizados especiais.)",
  "— Contabilidade, Análise Financeira e Ordem Tributária: conceitos e finalidades; patrimônio e equação fundamental; atos e fatos administrativos; contas e plano de contas; balancete de verificação; balanço patrimonial e DRE; noções de finanças, orçamento e tributos; análise financeira e gestão de risco; lavagem (9.613) e ordem tributária (8.137); indícios de fraude (smurfing, laranjas, movimentações incompatíveis).",
  "— Crimes Cibernéticos e Segurança Digital: Lei 12.737/2012; conceito e classificação de crimes cibernéticos; busca e apreensão de itens digitais (art. 240 e ss. do CPP); privacidade e cuidados com redes sociais; autenticação multifator e senhas seguras; golpes virtuais (phishing, links suspeitos, malwares); LGPD (Lei 13.709/2018).",
  "",
  "FORA DO FOCO: o candidato tirou do plano a matéria Estatística e Análise de Dados / Ciência de Dados (machine learning, Python, inferência) — não puxe o estudo para lá. E a prova NÃO é de Soldado da PMAL nem de outro cargo: ignore qualquer contexto antigo nesse sentido.",
  "",
  "COMO USAR ISTO: quando o aluno perguntar se um tema pode cair, responda pelo edital acima — diga em qual matéria e em qual prova (P1 ou P2) o tema se encaixa, ou diga com honestidade que está fora do edital dele. Um ponto fundamental ou diretamente vizinho a uma matéria listada pode aparecer mesmo sem estar escrito com todas as letras; sinalize quando for o caso. Nunca afirme que algo cai sem ter certeza.",
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
    "Monte um esquema ORGANIZADO e objetivo para colar no resumo: o NÚCLEO da questão em destaque e, à volta, os pontos vizinhos que caem junto com esse tema — sempre AGRUPADOS por assunto, nunca uma lista solta de fatos avulsos. Responda SOMENTE com o esquema — sem preâmbulo, sem repetir o enunciado, sem citar \"a questão\", \"o item\" ou \"o gabarito\", sem comentar o acerto ou o erro do aluno. Escreva o CONTEÚDO em si, não a pegadinha da banca.",
    "Estrutura, com uma LINHA EM BRANCO entre o núcleo e cada grupo:",
    "",
    "Parte 1 — Núcleo: a PRIMEIRA linha, começando com a seta \"→ \" (não escreva a palavra \"núcleo\"). É a regra/conceito EXATO que este item cobrou. Havendo base legal segura, cite o artigo entre parênteses. Deixe em CAIXA ALTA as 2 ou 3 palavras-chave decisivas (o termo exato, o prazo, a autoridade).",
    "Parte 2 — Em volta (o que cai junto): traga os pontos vizinhos que o aluno precisa fixar com este tema — a classificação a que o núcleo pertence, o ROL de casos/hipóteses/requisitos do instituto, o instituto irmão que a banca costuma comparar. AGRUPE por assunto: cada grupo começa com um RÓTULO curto terminando em dois-pontos, numa linha só (ex.: \"Extraterritorialidade incondicionada (art. 7º, I):\"), e logo abaixo cada item numa linha começando com travessão \"— \". Quando o grupo for uma lista fechada (os casos, as hipóteses, os requisitos), traga TODOS os itens dela. Use no MÁXIMO 2 rótulos e só o que é DIRETAMENTE vizinho ao núcleo — nada de desviar para temas que não se conectam. Se não há nada estruturado em volta, encerre no núcleo.",
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
