// Utilitários para transformar um link colado do YouTube no que o player embutido
// precisa. Aceita as formas comuns: youtu.be/ID, youtube.com/watch?v=ID,
// /embed/ID, /shorts/ID, /live/ID, playlists (list=) e até o ID cru (11 chars).

export interface YoutubeRef {
  /** ID do vídeo (11 caracteres) — null se for uma playlist pura. */
  videoId: string | null;
  /** ID da playlist, quando houver (list=...). */
  listId: string | null;
  /** Início em segundos (t= / start=), quando houver. */
  start: number | null;
}

/** Converte "1h2m3s", "90s" ou "90" em segundos. Retorna null se não der. */
function parseTempo(valor: string | null): number | null {
  if (!valor) return null;
  if (/^\d+$/.test(valor)) return Number(valor);
  const m = valor.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/i);
  if (!m || (!m[1] && !m[2] && !m[3])) return null;
  return Number(m[1] ?? 0) * 3600 + Number(m[2] ?? 0) * 60 + Number(m[3] ?? 0);
}

const ID_RE = /^[\w-]{11}$/;

export function parseYoutube(raw: string): YoutubeRef | null {
  const texto = (raw ?? "").trim();
  if (!texto) return null;

  // Colou só o ID do vídeo.
  if (ID_RE.test(texto)) return { videoId: texto, listId: null, start: null };

  let u: URL;
  try {
    u = new URL(texto.startsWith("http") ? texto : `https://${texto}`);
  } catch {
    return null;
  }

  const host = u.hostname.replace(/^www\./, "");
  const ehYT =
    host === "youtu.be" ||
    host === "youtube.com" ||
    host === "m.youtube.com" ||
    host === "music.youtube.com" ||
    host === "youtube-nocookie.com";
  if (!ehYT) return null;

  const listId = u.searchParams.get("list");
  const start = parseTempo(u.searchParams.get("t") ?? u.searchParams.get("start"));

  let videoId: string | null = null;
  if (host === "youtu.be") {
    videoId = u.pathname.slice(1).split("/")[0] || null;
  } else if (u.pathname === "/watch") {
    videoId = u.searchParams.get("v");
  } else {
    const m = u.pathname.match(/^\/(embed|shorts|live|v)\/([\w-]{11})/);
    if (m) videoId = m[2];
  }

  if (videoId && !ID_RE.test(videoId)) videoId = null;
  if (!videoId && !listId) return null;
  return { videoId, listId, start };
}

/** URL de embed (youtube-nocookie, mais discreto) a partir de um ref. */
export function embedUrl(ref: YoutubeRef): string {
  const base = "https://www.youtube-nocookie.com/embed";
  const params = new URLSearchParams({ rel: "0", modestbranding: "1" });
  if (ref.start) params.set("start", String(ref.start));
  if (ref.videoId) {
    if (ref.listId) params.set("list", ref.listId);
    return `${base}/${ref.videoId}?${params}`;
  }
  // Playlist pura: toca a série inteira.
  params.set("listType", "playlist");
  params.set("list", ref.listId!);
  return `${base}?${params}`;
}

/** Thumbnail do vídeo (usada nos itens da fila). */
export function thumbUrl(ref: YoutubeRef): string | null {
  return ref.videoId ? `https://i.ytimg.com/vi/${ref.videoId}/mqdefault.jpg` : null;
}
