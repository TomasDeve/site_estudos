// Links e tempos das aulas: reconhece o YouTube (para a miniatura e para abrir
// no ponto em que parou) e converte o "Parei em" entre texto e segundos.

const ID_RE = /^[\w-]{11}$/;

/** ID do vídeo do YouTube (11 caracteres) ou null se o link não for de vídeo do YouTube. */
export function idYoutube(raw: string): string | null {
  const texto = (raw ?? "").trim();
  if (!texto) return null;
  let u: URL;
  try {
    u = new URL(texto.startsWith("http") ? texto : `https://${texto}`);
  } catch {
    return null;
  }
  const host = u.hostname.replace(/^(www|m|music)\./, "");
  let id: string | null = null;
  if (host === "youtu.be") id = u.pathname.slice(1).split("/")[0] || null;
  else if (host === "youtube.com" || host === "youtube-nocookie.com") {
    if (u.pathname === "/watch") id = u.searchParams.get("v");
    else id = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/)?.[2] ?? null;
  }
  return id && ID_RE.test(id) ? id : null;
}

/** Miniatura do vídeo do YouTube. */
export function miniatura(url: string): string | null {
  const id = idYoutube(url);
  return id ? `https://i.ytimg.com/vi/${id}/mqdefault.jpg` : null;
}

/** Link para abrir a aula. No YouTube, já no ponto em que parou (t=). */
export function linkContinuar(url: string, parei: number): string {
  const id = idYoutube(url);
  if (!id) return url.startsWith("http") ? url : `https://${url}`;
  const u = new URL(`https://www.youtube.com/watch?v=${id}`);
  const lista = (() => {
    try {
      return new URL(url.startsWith("http") ? url : `https://${url}`).searchParams.get("list");
    } catch {
      return null;
    }
  })();
  if (lista) u.searchParams.set("list", lista);
  if (parei > 0) u.searchParams.set("t", `${parei}s`);
  return u.toString();
}

/** Nome curto do site (para links que não são do YouTube). */
export function site(url: string): string {
  try {
    return new URL(url.startsWith("http") ? url : `https://${url}`).hostname.replace(/^www\./, "");
  } catch {
    return url;
  }
}

/** 754 → "12:34"; 3754 → "1:02:34"; 0 → "0:00". */
export function formatarParei(seg: number): string {
  const s = Math.max(0, Math.round(seg));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const r = s % 60;
  const dois = (n: number) => String(n).padStart(2, "0");
  return h > 0 ? `${h}:${dois(m)}:${dois(r)}` : `${m}:${dois(r)}`;
}

/**
 * Lê o que ele digitou em "Parei em": "12:34" (min:seg), "1:02:34" (h:min:seg),
 * "1h02", "1h2m30s", "45m" ou só "45" (minutos). Vazio = 0. Retorna null se não entender.
 */
export function lerParei(texto: string): number | null {
  const t = texto.trim().toLowerCase().replace(/\s+/g, "");
  if (!t) return 0;
  if (/^\d+$/.test(t)) return Number(t) * 60;
  const partes = t.split(":");
  if (partes.length >= 2 && partes.length <= 3 && partes.every((p) => /^\d+$/.test(p))) {
    const n = partes.map(Number);
    if (n.slice(1).some((x) => x > 59)) return null;
    return partes.length === 3 ? n[0] * 3600 + n[1] * 60 + n[2] : n[0] * 60 + n[1];
  }
  // "1h02", "1h2m30s", "45m", "2m30": número sem unidade logo depois de "h" vale
  // minutos; depois de "m", segundos.
  const pedacos = [...t.matchAll(/(\d+)(h|min|m|s)?/g)];
  if (!pedacos.length || pedacos.map((p) => p[0]).join("") !== t) return null;
  let total = 0;
  let anterior: string | null = null;
  for (const [, n, u] of pedacos) {
    const unidade: string | null =
      u === "min" ? "m" : u ?? (anterior === "h" ? "m" : anterior === "m" ? "s" : null);
    if (!unidade) return null;
    total += Number(n) * (unidade === "h" ? 3600 : unidade === "m" ? 60 : 1);
    anterior = unidade;
  }
  return total;
}
