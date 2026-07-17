// Edge Function "tirar-duvida" — chat com IA sobre uma questão do caderno.
// Recebe a questão + histórico da conversa e devolve a resposta em streaming
// (texto puro, pedaço a pedaço), para a resposta começar a aparecer em ~1s.
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
  questao: {
    contexto?: string | null;
    enunciado: string;
    gabarito: boolean;
    comentario?: string | null;
    resposta?: boolean | null;
  };
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

  const { questao, materia, assunto } = payload;
  if (!questao?.enunciado || !Array.isArray(payload.mensagens)) {
    return erro("Envie `questao.enunciado` e `mensagens`.", 400);
  }

  // Só as últimas trocas — mantém o prompt curto e a resposta rápida.
  const mensagens = payload.mensagens
    .filter((m) => (m.role === "user" || m.role === "assistant") && m.content?.trim())
    .slice(-16)
    .map((m) => ({ role: m.role, content: m.content }));
  if (mensagens.length === 0 || mensagens[mensagens.length - 1].role !== "user") {
    return erro("A última mensagem precisa ser do aluno.", 400);
  }

  const situacao = questao.resposta === null || questao.resposta === undefined
    ? "O aluno ainda não respondeu este item."
    : `O aluno respondeu ${rotulo(questao.resposta)} e ${
      questao.resposta === questao.gabarito ? "ACERTOU" : "ERROU"
    }.`;

  const system = [
    "Você é um professor particular preparando um candidato para o concurso de Soldado da PMAL 2026 (banca CEBRASPE, itens de Certo/Errado). O aluno está resolvendo questões e abriu um chat para tirar dúvida sobre O ITEM ABAIXO.",
    "",
    materia ? `Matéria: ${materia}` : null,
    assunto ? `Assunto: ${assunto}` : null,
    questao.contexto ? `Comando da questão: ${questao.contexto}` : null,
    `Item: ${questao.enunciado}`,
    `Gabarito: ${rotulo(questao.gabarito)}`,
    situacao,
    questao.comentario ? `Comentário do gabarito: ${questao.comentario}` : null,
    "",
    "Regras da resposta:",
    "- Português do Brasil, tom de professor direto. Vá direto ao ponto: na maioria das vezes, 2 a 6 frases bastam.",
    "- Texto corrido, sem markdown (nada de asteriscos ou cerquilhas). Para listas curtas, use travessão (—) no começo da linha.",
    "- Foque no que derruba candidato na prova: pegadinhas, troca de termos, prazos, autoridades competentes, exceções.",
    "- Se o aluno errou, aponte onde o raciocínio dele provavelmente escorregou.",
    "- Não invente lei, número de artigo ou jurisprudência; se não tiver certeza, diga que não tem.",
    "- Quando couber, feche com um macete curto ou com o jeito que a banca costuma cobrar o tema.",
  ]
    .filter((linha) => linha !== null)
    .join("\n");

  const client = new Anthropic({ apiKey });

  // Opus 4.8 sem thinking (padrão ao omitir) + streaming: primeira palavra
  // chega rápido e o aluno não perde o ritmo.
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 1200,
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
