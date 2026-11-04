// Mesure d'audience maison, sans cookie : un identifiant aléatoire par onglet (sessionStorage), jamais d'adresse IP ni de donnée personnelle.
// Respecte « Ne pas me suivre » (DNT) et Global Privacy Control.
export type TrackType = "pageview" | "add_to_cart" | "begin_checkout" | "login" | "signup";

const KEY = "essnc-sid";
const sid = () => {
  try {
    let v = sessionStorage.getItem(KEY);
    if (!v) { v = crypto.randomUUID(); sessionStorage.setItem(KEY, v); }
    return v;
  } catch { return null; }
};

export const trackingAllowed = () => {
  if (typeof window === "undefined") return false;
  const n = navigator as Navigator & { globalPrivacyControl?: boolean };
  return n.doNotTrack !== "1" && !n.globalPrivacyControl;
};

export function track(type: TrackType, extra: { path?: string; ref?: string; src?: string; med?: string; v?: number; handle?: string } = {}) {
  if (!trackingAllowed()) return;
  const s = sid();
  if (!s) return;
  const body = JSON.stringify({ s, t: type, p: extra.path ?? window.location.pathname, ref: extra.ref, src: extra.src, med: extra.med, v: extra.v, h: extra.handle });
  try {
    if (navigator.sendBeacon?.("/api/track", new Blob([body], { type: "text/plain" }))) return;
    void fetch("/api/track", { method: "POST", body, keepalive: true, headers: { "Content-Type": "text/plain" } });
  } catch { /* la mesure ne doit jamais gêner la navigation */ }
}
