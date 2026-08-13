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
  "Você é um professor particular preparando um candidato para o concurso de Soldado da PMAL 2026 (banca CEBRASPE, itens de Certo/Errado).";

const REGRAS_COMUNS = [
  "- Português do Brasil, tom de professor direto. Vá direto ao ponto.",
  "- Texto corrido, sem markdown (nada de asteriscos ou cerquilhas). Para listas curtas, use travessão (—) no começo da linha.",
  "- Não invente lei, número de artigo ou jurisprudência; se não tiver certeza, diga que não tem.",
];

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
