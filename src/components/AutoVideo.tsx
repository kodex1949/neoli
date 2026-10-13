"use client";

import { useEffect, useRef } from "react";
import type { MediaItem } from "@/lib/shopify";

/** Vidéo de carte : lecture silencieuse en boucle, uniquement quand elle est visible à l'écran. */
export function AutoVideo({ video, className }: { video: MediaItem; className?: string }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return;
    v.muted = true;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) v.play().catch(() => {});
      else v.pause();
    }, { threshold: 0.25 });
    io.observe(v);
    return () => io.disconnect();
  }, []);
  return (
    <video ref={ref} className={className} poster={video.url || undefined} muted loop playsInline preload="metadata" aria-label={video.alt}>
      {video.sources?.map((s) => <source key={s.url} src={s.url} type={s.mimeType} />)}
    </video>
  );
}
