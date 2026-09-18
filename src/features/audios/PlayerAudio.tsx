import { useEffect, useRef, useState } from "react";
import type { Audio } from "@/types/db";
import { embedUrl, type YoutubeRef } from "./youtube";

// A API do IFrame do YouTube não tem tipos instalados — uso um shape mínimo.
type YTPlayer = {
  getCurrentTime?: () => number;
  getDuration?: () => number;
  seekTo?: (s: number, allow: boolean) => void;
  destroy?: () => void;
};
declare global {
  interface Window {
    YT?: { Player: new (el: Element, opts: unknown) => YTPlayer };
    onYouTubeIframeAPIReady?: () => void;
  }
}

let ytPromise: Promise<Window["YT"]> | null = null;
function loadYT(): Promise<Window["YT"]> {
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (ytPromise) return ytPromise;
  ytPromise = new Promise((resolve) => {
    const anterior = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      anterior?.();
      resolve(window.YT);
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  });
  return ytPromise;
}

function fmt(seg: number): string {
  if (!seg || seg < 0) return "0:00";
  const h = Math.floor(seg / 3600);
  const m = Math.floor((seg % 3600) / 60);
  const s = Math.floor(seg % 60);
  const mm = h > 0 ? String(m).padStart(2, "0") : String(m);
  return `${h > 0 ? `${h}:` : ""}${mm}:${String(s).padStart(2, "0")}`;
}

interface Props {
  audio: Audio;
  ytRef: YoutubeRef;
  onSalvar: (posicaoSeg: number, duracaoSeg: number) => void;
}

export function PlayerAudio({ audio, ytRef, onSalvar }: Props) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<YTPlayer | null>(null);
  const curRef = useRef(audio.posicao_seg || 0);
  const durRef = useRef(audio.duracao_seg || 0);
  const salvoRef = useRef(audio.posicao_seg || 0);
  const onSalvarRef = useRef(onSalvar);
  onSalvarRef.current = onSalvar;

  const [cur, setCur] = useState(audio.posicao_seg || 0);
  const [dur, setDur] = useState(audio.duracao_seg || 0);

  function salvar(forcar: boolean) {
    const c = curRef.current;
    const d = durRef.current;
    if (!forcar && c <= 0) return;
    if (!forcar && c === salvoRef.current) return;
    salvoRef.current = c;
    onSalvarRef.current(c, d);
  }

  useEffect(() => {
    // Sem videoId (playlist pura) não dá pra medir progresso: cai no iframe simples.
    if (!ytRef.videoId) return;
    let cancelado = false;
    let intervalo: ReturnType<typeof setInterval> | null = null;
    // Deixa a API substituir um <div> criado FORA do React (o React nunca vê esse
    // nó), evitando erro de reconciliação quando o player é destruído.
    const alvo = document.createElement("div");
    alvo.style.width = "100%";
    alvo.style.height = "100%";
    wrapRef.current?.appendChild(alvo);

    loadYT().then((YT) => {
      if (cancelado || !YT) return;
      playerRef.current = new YT.Player(alvo, {
        width: "100%",
        height: "100%",
        videoId: ytRef.videoId,
        host: "https://www.youtube-nocookie.com",
        playerVars: {
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          start: Math.max(0, Math.floor(audio.posicao_seg || 0)),
          ...(ytRef.listId ? { list: ytRef.listId } : {}),
        },
        events: {
          onReady: (e: { target: YTPlayer }) => {
            const d = Math.floor(e.target.getDuration?.() ?? 0);
            if (d) {
              durRef.current = d;
              setDur(d);
            }
          },
          // 2 = pausado, 0 = terminou → grava na hora.
          onStateChange: (e: { data: number }) => {
            if (e.data === 2 || e.data === 0) salvar(true);
          },
        },
      });

      intervalo = setInterval(() => {
        const p = playerRef.current;
        if (!p?.getCurrentTime) return;
        const c = Math.floor(p.getCurrentTime() ?? 0);
        const d = Math.floor(p.getDuration?.() ?? durRef.current);
        curRef.current = c;
        if (d) durRef.current = d;
        setCur(c);
        if (d) setDur(d);
        if (c > 0 && Math.abs(c - salvoRef.current) >= 5) salvar(false);
      }, 1000);
    });

    return () => {
      cancelado = true;
      if (intervalo) clearInterval(intervalo);
      salvar(true);
      try {
        playerRef.current?.destroy?.();
      } catch {
        /* já removido */
      }
      playerRef.current = null;
      // Remove o placeholder (StrictMode em dev roda o efeito 2x): sem isso
      // sobraria um <div>/iframe órfão dentro do wrapper.
      alvo.remove();
    };
    // Recria só quando muda o vídeo (a página remonta via key={audio.id}).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ytRef.videoId]);

  function scrub(e: React.MouseEvent<HTMLDivElement>) {
    const p = playerRef.current;
    const d = durRef.current || dur;
    if (!p?.seekTo || !d) return;
    const r = e.currentTarget.getBoundingClientRect();
    const frac = Math.max(0, Math.min(1, (e.clientX - r.left) / r.width));
    const t = Math.floor(frac * d);
    p.seekTo(t, true);
    curRef.current = t;
    setCur(t);
    salvar(true);
  }

  // Playlist pura (sem vídeo único): iframe simples, sem barra de progresso.
  if (!ytRef.videoId) {
    return (
      <div className="relative aspect-video w-full bg-black">
        <iframe
          src={embedUrl(ytRef)}
          title={audio.titulo || audio.url}
          className="absolute inset-0 h-full w-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      </div>
    );
  }

  const pct = dur > 0 ? Math.min(100, (cur / dur) * 100) : 0;

  return (
    <div>
      <div className="relative aspect-video w-full bg-black">
        <div ref={wrapRef} className="absolute inset-0 h-full w-full" />
      </div>
      {/* Barra de progresso — mostra onde parei; clique pula pro ponto. */}
      <div className="px-1 pt-2">
        <div
          onClick={scrub}
          className="group/bar relative h-2 cursor-pointer rounded-full bg-navy-700"
          title="Clique para pular para um ponto"
        >
          <div
            className="absolute inset-y-0 left-0 rounded-full bg-gold transition-[width] duration-300"
            style={{ width: `${pct}%` }}
          />
          <div
            className="absolute top-1/2 size-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-gold opacity-0 shadow transition-opacity group-hover/bar:opacity-100"
            style={{ left: `${pct}%` }}
          />
        </div>
        <div className="mt-1 flex justify-between text-[11px] tabular-nums text-mut">
          <span>{fmt(cur)}</span>
          <span>{dur > 0 ? fmt(dur) : "—"}</span>
        </div>
      </div>
    </div>
  );
}
