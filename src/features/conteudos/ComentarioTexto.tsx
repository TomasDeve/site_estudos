/**
 * Corpo do "Comentário" da questão: uma linha por parágrafo (quebras `\n` do
 * banco) e o rótulo inicial de cada linha em destaque — "Certo." / "Errado.",
 * "Letra C.", "As erradas:", "B:", "II certo:" etc.
 */
const ROTULO =
  /^(?:Certo|Errado|CERTO|ERRADO|Correto|CORRETO|Falso|Item (?:certo|errado|correto)|Letra [A-E]|Gabarito:? (?:letra )?[A-E]|Certa a (?:letra )?[A-E]|A letra [A-E]|As erradas|As demais|As outras|Erros|[A-E]|[IVX]{1,4} (?:certo|errado|correto|incorreto))[.:)]/;

function Linha({ texto }: { texto: string }) {
  const m = texto.match(ROTULO);
  if (!m) return <p>{texto}</p>;
  const rotulo = m[0];
  const cor = /^(Certo|CERTO|Correto|CORRETO|Item c)/.test(rotulo)
    ? "text-green"
    : /^(Errado|ERRADO|Falso|Item errado)/.test(rotulo)
      ? "text-red"
      : "text-txt";
  return (
    <p>
      <span className={`font-semibold ${cor}`}>{rotulo}</span>
      {texto.slice(rotulo.length)}
    </p>
  );
}

export function ComentarioTexto({ texto }: { texto: string }) {
  const linhas = texto
    .split(/\n+/)
    .map((l) => l.trim())
    .filter(Boolean);
  return (
    <div className="space-y-1 text-xs leading-relaxed text-dim">
      {linhas.map((l, i) => (
        <Linha key={i} texto={l} />
      ))}
    </div>
  );
}
