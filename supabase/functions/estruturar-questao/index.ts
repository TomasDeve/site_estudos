// Edge Function "estruturar-questao" — recebe o TEXTO CRU de uma questão colada
// (ex.: Ctrl+A/Ctrl+C na questão do QConcursos) e devolve JSON estruturado
// (banca, ano, tipo, enunciado, alternativas, gabarito, etc.) para a tela de
// curadoria salvar em `questoes_importadas`.
//
// Não devolve streaming — é uma extração única, com tool forçada para garantir
// JSON válido. O comentário é SEMPRE gerado do zero pela IA; o comentário do
// professor que venha no texto colado é ignorado de propósito.
//
// Segredo necessário (Dashboard → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY = chave da API da Anthropic
import Anthropic from "npm:@anthropic-ai/sdk";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function erro(mensagem: string, status: number): Response {
  return new Response(JSON.stringify({ erro: mensagem }), {
    status,
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8" },
  });
}

const SYSTEM = [
  "Você extrai UMA questão de concurso a partir de um texto colado do site QConcursos (ou parecido).",
  "O texto vem bagunçado: pode ter um cabeçalho com Ano/Banca/Órgão/Prova/Cargo, o enunciado, as alternativas (A, B, C, D, E) e, às vezes, o gabarito marcado. Pode vir junto lixo (botões, estatística de acertos, 'Comentários do professor', propaganda) — ignore o lixo.",
  "",
  "Regras de extração:",
  "- tipo: 'ce' quando é item de Certo/Errado (padrão CEBRASPE, 'julgue o item', sem alternativas A–E). Caso contrário 'multipla'.",
  "- enunciado: só o texto do item/pergunta, limpo. Se houver um comando/texto-base separado (ex.: 'Acerca de X, julgue o item a seguir.'), coloque-o em contexto.",
  "- alternativas: para 'multipla', liste cada uma como {letra, texto} (A, B, C…). Para 'ce', use lista vazia.",
  "- gabarito: se — e SOMENTE se — o texto indicar a resposta correta (alternativa marcada como certa, 'Gabarito: X', etc.), preencha gabarito_letra (múltipla) ou gabarito_bool (ce; true = Certo). Se o texto NÃO mostrar o gabarito, deixe ambos nulos e NÃO tente adivinhar/resolver.",
  "- nivel: escolaridade do cargo ('fundamental'|'medio'|'superior') se der para inferir do cargo/órgão; senão nulo.",
  "- dificuldade: sua estimativa ('facil'|'medio_facil'|'medio_dificil'|'dificil') para ajudar a filtrar depois; na dúvida, nulo.",
  "- comentario: escreva você mesmo, do zero, um comentário curto de professor (2 a 4 frases) explicando por que o gabarito é esse e a pegadinha. NUNCA copie o comentário do professor que esteja no texto colado. Se o gabarito for desconhecido, devolva comentario vazio.",
  "- Não invente banca, ano, artigo de lei nem jurisprudência: na dúvida, deixe nulo.",
  "",
  "Responda SEMPRE chamando a ferramenta registrar_questao.",
].join("\n");

const TOOL: Anthropic.Tool = {
  name: "registrar_questao",
  description: "Registra a questão extraída do texto colado.",
  input_schema: {
    type: "object",
    properties: {
      banca: { type: ["string", "null"] },
      ano: { type: ["integer", "null"] },
      orgao: { type: ["string", "null"] },
      cargo: { type: ["string", "null"] },
      prova: { type: ["string", "null"] },
      disciplina: { type: ["string", "null"], description: "Disciplina/matéria como aparece no site." },
      assunto: { type: ["string", "null"], description: "Assunto/tópico como aparece no site." },
      nivel: { type: ["string", "null"], enum: ["fundamental", "medio", "superior", null] },
      tipo: { type: "string", enum: ["multipla", "ce"] },
      contexto: { type: ["string", "null"], description: "Comando/texto-base, se separado do enunciado." },
      enunciado: { type: "string" },
      alternativas: {
        type: "array",
        items: {
          type: "object",
          properties: { letra: { type: "string" }, texto: { type: "string" } },
          required: ["letra", "texto"],
        },
      },
      gabarito_letra: { type: ["string", "null"], description: "Letra da correta (múltipla), ex.: 'C'." },
      gabarito_bool: { type: ["boolean", "null"], description: "Certo/Errado: true = Certo." },
      dificuldade: {
        type: ["string", "null"],
        enum: ["facil", "medio_facil", "medio_dificil", "dificil", null],
      },
      comentario: { type: "string" },
    },
    required: ["tipo", "enunciado", "alternativas", "comentario"],
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return erro("Use POST.", 405);

  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) {
    return erro("ANTHROPIC_API_KEY não configurada nos segredos das Edge Functions.", 500);
  }

  let body: { texto?: string };
  try {
    body = await req.json();
  } catch {
    return erro("Corpo inválido: envie JSON.", 400);
  }

  const texto = (body.texto ?? "").trim();
  if (texto.length < 20) {
    return erro("Cole o texto da questão (enunciado + alternativas).", 400);
  }
  // Defesa: não deixa um paste gigante estourar o prompt.
  const conteudo = texto.slice(0, 16000);

  const client = new Anthropic({ apiKey });

  let message: Anthropic.Message;
  try {
    message = await client.messages.create({
      model: "claude-opus-4-8",
      max_tokens: 2000,
      output_config: { effort: "low" },
      system: SYSTEM,
      tools: [TOOL],
      tool_choice: { type: "tool", name: "registrar_questao" },
      messages: [{ role: "user", content: `Texto colado da questão:\n\n${conteudo}` }],
    });
  } catch (err) {
    return erro(`A IA não respondeu: ${err instanceof Error ? err.message : String(err)}`, 502);
  }

  const bloco = message.content.find((c) => c.type === "tool_use");
  if (!bloco || bloco.type !== "tool_use") {
    return erro("Não consegui interpretar a questão nesse texto.", 422);
  }

  return new Response(JSON.stringify(bloco.input), {
    headers: { ...CORS, "Content-Type": "application/json; charset=utf-8", "Cache-Control": "no-store" },
  });
});
