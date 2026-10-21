# Gera src/features/paragrafos/temas.json (o banco de temas do treino de parágrafos)
# a partir dos fontes do PDF "Atualidades para a Redação - PCPE 2026":
#   impressao/Atualidades-Redacao-PCPE/blocos/b01..b12.txt  (Proposta A + esqueleto)
#   impressao/Atualidades-Redacao-PCPE/blocos/extras.txt    (E1..E10, proposta X + esqueleto)
#   tools/paragrafos-esqueletos-b.txt                        (esqueleto das Propostas B, que o PDF não tem)
#   tools/paragrafos-modelos.txt                             (parágrafo modelo de cada parte, critérios Cebraspe)
#   tools/paragrafos-embasamento.txt                         (dado, lei ou caso concreto de cada ponto, com fonte)
# Entra só proposta que tem esqueleto (é dele que sai o repertório de cada parágrafo).
# Rodar da raiz do repo:  py -3.14 -I tools/paragrafos-temas.py
import json
import pathlib
import re
import sys

RAIZ = pathlib.Path(sys.argv[0]).resolve().parent.parent
BLOCOS = RAIZ / "impressao" / "Atualidades-Redacao-PCPE" / "blocos"
SAIDA = RAIZ / "src" / "features" / "paragrafos" / "temas.json"


def limpa(s: str) -> str:
    s = re.sub(r"\{\{(.+?)\}\}", r"(\1)", s)
    s = re.sub(r"\[\[fonte:\s*(.+?)\]\]", r"(fonte: \1)", s)
    return re.sub(r"\s+", " ", s).strip()


def secao(linhas: list[str], abre: str) -> list[str] | None:
    """Linhas entre a 1ª linha que começa com `abre` e o @fim seguinte."""
    for i, l in enumerate(linhas):
        if l.startswith(abre):
            fim = next(j for j in range(i + 1, len(linhas)) if linhas[j].strip() == "@fim")
            return linhas[i + 1 : fim]
    return None


def esqueleto(linhas: list[str]) -> dict:
    out: dict = {"abre": [], "anuncia": [], "p1": [], "p2": [], "fim": [], "pronta": ""}
    for l in linhas:
        chave, _, valor = l.partition(":")
        chave = chave.strip()
        if chave == "pronta":
            out["pronta"] = limpa(valor)
        elif chave in out:
            out[chave].append(limpa(valor))
    return out


def proposta(linhas: list[str]) -> dict:
    textos, aspectos, tema = [], [], ""
    for l in linhas:
        chave, _, valor = l.partition(":")
        chave = chave.strip()
        if chave == "texto":
            corpo, _, fonte = valor.partition("~")
            textos.append({"texto": limpa(corpo), "fonte": limpa(fonte)})
        elif chave == "tema":
            tema = limpa(valor)
        elif chave == "aspecto":
            txt, _, valor_pts = valor.rpartition("|")
            aspectos.append(
                {"texto": limpa(txt).rstrip(";.").strip(), "valor": valor_pts.strip()}
            )
    assert tema and len(aspectos) == 3, f"proposta incompleta: {tema!r}"
    return {"tema": tema, "textos": textos, "aspectos": aspectos}


def decorar(linhas: list[str] | None) -> list[dict]:
    itens = []
    for l in linhas or []:
        tipo, _, resto = l.partition(":")
        partes = [limpa(p) for p in resto.split("::")]
        texto = partes[1] if len(partes) > 1 else ""
        if len(partes) > 2:
            texto += f" (fonte: {partes[2]})"
        itens.append({"tipo": tipo.strip(), "titulo": partes[0], "texto": texto})
    return itens


esqueletos_b = (RAIZ / "tools" / "paragrafos-esqueletos-b.txt").read_text(encoding="utf-8").splitlines()

temas = []
for n in range(1, 13):
    linhas = (BLOCOS / f"b{n:02d}.txt").read_text(encoding="utf-8").splitlines()
    _, titulo, _ = [p.strip() for p in linhas[0].lstrip("# ").split("|")]
    para_decorar = decorar(secao(linhas, "@decorar"))
    temas.append(
        {
            "id": f"b{n:02d}a",
            "bloco": titulo,
            **proposta(secao(linhas, "@proposta A")),
            "decorar": para_decorar,
            "esqueleto": esqueleto(secao(linhas, "@esqueleto")),
        }
    )
    temas.append(
        {
            "id": f"b{n:02d}b",
            "bloco": titulo,
            **proposta(secao(linhas, "@proposta B")),
            "decorar": para_decorar,
            "esqueleto": esqueleto(secao(esqueletos_b, f"@esqueleto b{n:02d}")),
        }
    )

extras = (BLOCOS / "extras.txt").read_text(encoding="utf-8")
for parte in re.split(r"^(?=# E\d+ )", extras, flags=re.M):
    if not parte.strip():
        continue
    linhas = parte.splitlines()
    cod, titulo, _ = [p.strip() for p in linhas[0].lstrip("# ").split("|")]
    ini = linhas.index("## O essencial") + 1
    fim_ess = next(i for i in range(ini, len(linhas)) if linhas[i].startswith("@"))
    essencial = [limpa(l.lstrip("- ")) for l in linhas[ini:fim_ess] if l.startswith("- ")]
    p = proposta(secao(linhas, "@proposta X"))
    temas.append(
        {
            "id": cod.lower(),
            "bloco": titulo,
            **p,
            "decorar": [{"tipo": "essencial", "titulo": "", "texto": e} for e in essencial],
            "esqueleto": esqueleto(secao(linhas, "@esqueleto")),
        }
    )

modelos_txt = (RAIZ / "tools" / "paragrafos-modelos.txt").read_text(encoding="utf-8")
modelos = {
    tid: {k.strip(): limpa(v) for k, _, v in (l.partition(":") for l in corpo.splitlines())}
    for tid, corpo in re.findall(r"^@modelo (\S+)\n(.*?)\n@fim", modelos_txt, flags=re.M | re.S)
}
for t in temas:
    m = modelos.get(t["id"])
    assert m and set(m) == {"intro", "p1", "p2", "fim"}, f"modelo incompleto: {t['id']}"
    t["modelo"] = m

embasamento_txt = (RAIZ / "tools" / "paragrafos-embasamento.txt").read_text(encoding="utf-8")
embasamentos = {}
for tid, corpo in re.findall(r"^@embasamento (\S+)\n(.*?)\n@fim", embasamento_txt, flags=re.M | re.S):
    por_parte: dict = {"p1": [], "p2": [], "fim": []}
    for linha in corpo.splitlines():
        chave, _, valor = linha.partition(":")
        por_parte[chave.strip()].append(limpa(valor))
    embasamentos[tid] = por_parte
for t in temas:
    b = embasamentos.get(t["id"])
    assert b, f"sem embasamento: {t['id']}"
    for parte in ("p1", "p2", "fim"):
        assert len(b[parte]) == len(t["esqueleto"][parte]), f"{t['id']} {parte}: {len(b[parte])} x {len(t['esqueleto'][parte])}"
    t["embasamento"] = b

for t in temas:
    e = t["esqueleto"]
    assert e["abre"] and len(e["anuncia"]) == 3 and e["p1"] and e["p2"] and e["fim"], t["id"]

SAIDA.parent.mkdir(parents=True, exist_ok=True)
SAIDA.write_text(json.dumps(temas, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
print(f"{len(temas)} temas -> {SAIDA.relative_to(RAIZ)}")
