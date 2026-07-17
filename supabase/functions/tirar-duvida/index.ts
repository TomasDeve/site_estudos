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
  materia?: string | null;
  assunto?: string | null;
  questao?: {
    contexto?: string | null;
    enunciado: string;
    gabarito: boolean;
    comentario?: string | null;
    resposta?: boolean | null;
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

const BASE =
  "Você é um professor particular preparando um candidato para o concurso de Soldado da PMAL 2026 (banca CEBRASPE, itens de Certo/Errado).";

const REGRAS_COMUNS = [
  "- Português do Brasil, tom de professor direto. Vá direto ao ponto.",
  "- Texto corrido, sem markdown (nada de asteriscos ou cerquilhas). Para listas curtas, use travessão (—) no começo da linha.",
  "- Não invente lei, número de artigo ou jurisprudência; se não tiver certeza, diga que não tem.",
];

function systemQuestao(p: Payload): string {
  const q = p.questao!;
  const situacao = q.resposta === null || q.resposta === undefined
    ? "O aluno ainda não respondeu este item."
    : `O aluno respondeu ${rotulo(q.resposta)} e ${
      q.resposta === q.gabarito ? "ACERTOU" : "ERROU"
    }.`;
  return [
    `${BASE} O aluno está resolvendo questões e abriu um chat para tirar dúvida sobre O ITEM ABAIXO.`,
    "",
    p.materia ? `Matéria: ${p.materia}` : null,
    p.assunto ? `Assunto: ${p.assunto}` : null,
    q.contexto ? `Comando da questão: ${q.contexto}` : null,
    `Item: ${q.enunciado}`,
    `Gabarito: ${rotulo(q.gabarito)}`,
    situacao,
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

  const system = temResumo ? systemResumo(payload) : systemQuestao(payload);

  const client = new Anthropic({ apiKey });

  // Opus 4.8 sem thinking (padrão ao omitir) + streaming: primeira palavra
  // chega rápido e o aluno não perde o ritmo.
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 1600,
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
