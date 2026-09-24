import { useMemo } from "react";
import type { TopicoQuestao } from "@/types/db";
import { hojeISO, fmtData } from "@/lib/dates";
import { partesDeTexto } from "@/features/conteudos/grifos";
import { cabecalhoFonte } from "@/features/conteudos/fonteQuestao";
import { alternativasDe, ehMultipla } from "@/features/conteudos/questaoModelo";
import { blocosPorTexto, listaNumeros, type MateriaImpressao } from "./organizar";
import type { OpcoesFolha } from "./opcoes";

interface Props {
  /** O que vai para o papel, já agrupado (e filtrado) como na tela, na ordem dos números. */
  materias: MateriaImpressao[];
  numeroDe: Map<string, number>;
  opcoes: OpcoesFolha;
  /** Nome do concurso no cabeçalho (ex.: "PC AL"). */
  concurso?: string;
}

/**
 * A folha de impressão: um documento à parte, preto no branco, que só aparece ao
 * imprimir (ou na prévia). Organizada como uma prova — matéria, assunto, o texto
 * associado uma vez só antes das questões dele — e SÓ com as questões: sem gabarito,
 * comentário, grifos, riscos ou respostas dadas. A correção é no site, pela mesma
 * numeração. Os estilos ficam em `index.css` (bloco "Folha de impressão"), em pt/mm.
 */
export function FolhaImpressao({ materias, numeroDe, opcoes, concurso }: Props) {
  const questoes = useMemo(
    () => materias.flatMap((m) => m.assuntos.flatMap((a) => a.questoes)),
    [materias]
  );
  // Números de todas as questões de cada texto associado: o texto sai completo uma
  // vez (no bloco da 1ª delas); os blocos seguintes só remetem a ele.
  const numerosDoTexto = useMemo(() => {
    const mapa = new Map<string, number[]>();
    for (const q of questoes) {
      if (!q.texto_associado?.trim()) continue;
      const lista = mapa.get(q.texto_associado) ?? [];
      lista.push(numeroDe.get(q.id) ?? 0);
      mapa.set(q.texto_associado, lista);
    }
    return mapa;
  }, [questoes, numeroDe]);

  if (questoes.length === 0) return null;
  const num = (q: TopicoQuestao) => numeroDe.get(q.id) ?? 0;
  const total = questoes.length;
  const nomes = [...new Set(materias.map((m) => m.nome))].join(" · ");

  return (
    <div className="folha" data-letra={opcoes.letra} data-colunas={opcoes.colunas}>
      <header className="folha-cabecalho">
        <div>
          <h1>Caderno de questões</h1>
          <p className="folha-sub">
            {[concurso, `${total} ${total === 1 ? "questão" : "questões"}`, nomes]
              .filter(Boolean)
              .join(" — ")}
          </p>
        </div>
        <p className="folha-sub folha-data">Impresso em {fmtData(hojeISO())}</p>
      </header>
      <p className="folha-campos">
        <span>Data: ____/____/________</span>
        <span>Início: ____:____</span>
        <span>Fim: ____:____</span>
      </p>

      {/* Um fluxo só de colunas para a folha inteira (os títulos de matéria vão dentro
          dele, como no caderno da prova): a 1ª coluna enche até o fim da página antes
          de a 2ª começar — inclusive na última página. */}
      <div className="folha-colunas">
        {materias.map((m, i) => {
          const qtd = m.assuntos.reduce((s, a) => s + a.questoes.length, 0);
          return (
            <section key={`${m.materiaId}-${i}`} className="folha-materia">
              <h2>
                {m.nome}
                <small>
                  {qtd} {qtd === 1 ? "questão" : "questões"}
                </small>
              </h2>
              {m.assuntos.map((a) => (
                <section key={a.questoes[0].id} className="folha-assunto">
                  <h3>{a.titulo}</h3>
                  {blocosPorTexto(a.questoes).map((b) => {
                    const numeros = b.texto ? (numerosDoTexto.get(b.texto) ?? []) : [];
                    const primeiro = numeros.length ? Math.min(...numeros) : 0;
                    const textoAqui = b.texto && b.questoes.some((q) => num(q) === primeiro);
                    return (
                      <div key={b.questoes[0].id}>
                        {b.texto &&
                          (textoAqui ? (
                            <TextoFolha texto={b.texto} numeros={numeros} />
                          ) : (
                            <p className="folha-texto-ref">
                              Texto associado: o mesmo impresso antes da questão {primeiro}.
                            </p>
                          ))}
                        {b.questoes.map((q) => (
                          <QuestaoFolha key={q.id} questao={q} numero={num(q)} />
                        ))}
                      </div>
                    );
                  })}
                </section>
              ))}
            </section>
          );
        })}
      </div>
    </div>
  );
}

function TextoFolha({ texto, numeros }: { texto: string; numeros: number[] }) {
  return (
    <div className="folha-texto">
      <p className="folha-texto-rotulo">
        {numeros.length === 1
          ? `Texto associado à questão ${numeros[0]}`
          : `Texto associado às questões ${listaNumeros(numeros)}`}
      </p>
      <div className="folha-texto-corpo">
        {partesDeTexto(texto).map((p, i) =>
          p.tipo === "img" ? (
            <img key={i} src={p.url} alt="Texto associado (imagem)" />
          ) : (
            <span key={i}>{p.texto}</span>
          )
        )}
      </div>
    </div>
  );
}

function QuestaoFolha({ questao: q, numero }: { questao: TopicoQuestao; numero: number }) {
  return (
    <article className="folha-q">
      <p className="folha-q-cab">
        <span className="folha-q-num">Questão {numero}</span>
        {q.fonte?.trim() && <span className="folha-q-fonte">{cabecalhoFonte(q.fonte)}</span>}
      </p>
      {q.contexto?.trim() && <p className="folha-q-contexto">{q.contexto.trim()}</p>}
      <p className="folha-q-enunciado">{q.enunciado.trim()}</p>

      {ehMultipla(q) ? (
        <ol className="folha-alts">
          {alternativasDe(q).map((a) => (
            <li key={a.letra}>
              <span className="folha-letra">{a.letra}</span>
              <span>{a.texto}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="folha-ce">
          <span>
            <span className="folha-caixa" /> Certo
          </span>
          <span>
            <span className="folha-caixa" /> Errado
          </span>
        </p>
      )}
    </article>
  );
}
