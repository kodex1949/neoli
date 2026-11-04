"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react";
import { createClient } from "@/lib/supabase/client";
import "./admin-side.css";

export type AdminBadge = Record<string, number>;

type Item = { href: string; label: string; hint: string; icon: ReactNode };

const I = (d: ReactNode) => <svg viewBox="0 0 24 24" aria-hidden="true">{d}</svg>;
const ITEMS: { group: string; items: Item[] }[] = [
  {
    group: "Pilotage",
    items: [
      { href: "/admin", label: "Tableau de bord", hint: "Vue d'ensemble", icon: I(<><rect x="4" y="4" width="7" height="7" /><rect x="13" y="4" width="7" height="7" /><rect x="4" y="13" width="7" height="7" /><rect x="13" y="13" width="7" height="7" /></>) },
      { href: "/admin/commandes", label: "Commandes", hint: "Paiement, expédition, retours", icon: I(<><path d="M5 8h14l-1.2 11H6.2L5 8Z" /><path d="M9 8V6.5a3 3 0 0 1 6 0V8" /></>) },
      { href: "/admin/stocks", label: "Stocks", hint: "Ruptures, couverture, réassort", icon: I(<><path d="M4 8.5 12 4l8 4.5v7L12 20l-8-4.5v-7Z" /><path d="m4 8.5 8 4.5 8-4.5M12 13v7" /></>) },
      { href: "/admin/analytics", label: "Analytics", hint: "Ventes, audience, fiabilité", icon: I(<><path d="M4 20V10M10 20V4M16 20v-7M22 20H2" /></>) },
      { href: "/admin/direct", label: "En direct", hint: "Visiteurs sur le site maintenant", icon: I(<><circle cx="12" cy="12" r="2.2" /><path d="M7.6 7.6a6.2 6.2 0 0 0 0 8.8M16.4 7.6a6.2 6.2 0 0 1 0 8.8M4.8 4.8a10.2 10.2 0 0 0 0 14.4M19.2 4.8a10.2 10.2 0 0 1 0 14.4" /></>) },
    ],
  },
  {
    group: "Contenu",
    items: [
      { href: "/admin/menu", label: "Visuels & textes", hint: "Accueil, héros, menu", icon: I(<><rect x="3.5" y="5" width="17" height="14" rx="1" /><path d="m3.5 16 5-5 4 4 3-3 5 5" /><circle cx="15.5" cy="9.5" r="1.2" /></>) },
      { href: "/admin/creations", label: "Créations", hint: "Texte et visuel", icon: I(<><rect x="3.5" y="4.5" width="17" height="15" rx="1" /><path d="M12 4.5v15M15 9h3M15 12h3" /></>) },
      { href: "/admin/annonce", label: "Bandeau d'annonce", hint: "Texte et lien du haut de page", icon: I(<><rect x="3.5" y="8" width="17" height="8" rx="1" /><path d="M7 12h6" /></>) },
      { href: "/admin/avis", label: "Avis clients", hint: "Modération", icon: I(<path d="m12 4 2.4 5 5.4.7-4 3.8 1 5.4L12 16.2 7.2 18.9l1-5.4-4-3.8 5.4-.7L12 4Z" />) },
    ],
  },
  {
    group: "Intelligence",
    items: [
      { href: "/admin/approbations", label: "Approbations", hint: "Valider les actions des agents", icon: I(<><path d="m5 12.5 4.5 4.5L19 7.5" /></>) },
      { href: "/admin/agents", label: "Agents IA", hint: "Audits et actions", icon: I(<><circle cx="12" cy="9" r="3.5" /><path d="M5 20c0-3.6 3.1-6 7-6s7 2.4 7 6" /></>) },
      { href: "/admin/newsletter", label: "Newsletter", hint: "Inscrits et export", icon: I(<><rect x="3.5" y="6" width="17" height="12" rx="1" /><path d="m4 7 8 6 8-6" /></>) },
      { href: "/admin/connexions", label: "Connexions", hint: "État des services branchés", icon: I(<><circle cx="6" cy="12" r="2.5" /><circle cx="18" cy="6" r="2.5" /><circle cx="18" cy="18" r="2.5" /><path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" /></>) },
      { href: "/admin/logs", label: "Journal", hint: "Logs et erreurs", icon: I(<><path d="M5 5h14M5 10h14M5 15h9M5 20h6" /></>) },
    ],
  },
];

const LINKS = [
  { href: "/", label: "Voir le site", icon: I(<path d="M7 17 17 7M9 7h8v8" />) },
  { href: "https://admin.shopify.com/store/3rhvh0-9q", label: "Shopify", icon: I(<path d="M7 17 17 7M9 7h8v8" />), ext: true },
  { href: "https://supabase.com/dashboard/project/skaqmzsoiyuwxblxmdgp", label: "Supabase", icon: I(<path d="M7 17 17 7M9 7h8v8" />), ext: true },
  { href: "https://vercel.com/dashboard", label: "Vercel", icon: I(<path d="M7 17 17 7M9 7h8v8" />), ext: true },
];

/** Cadre de l'administration : navigation latérale façon Dior (filets fins, majuscules espacées, titres en serif). */
export function AdminShell({ email, badges, initialCollapsed = false, children }: { email: string; badges: AdminBadge; initialCollapsed?: boolean; children: ReactNode }) {
  const path = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const [leaving, setLeaving] = useState(false);
  const signOut = async () => {
    setLeaving(true);
    await supabase?.auth.signOut();
    router.replace("/");
    router.refresh();
  };
  const [open, setOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(initialCollapsed);
  const [ready, setReady] = useState(false);
  // Les transitions ne démarrent qu'après le premier affichage : pas d'animation parasite au chargement.
  useEffect(() => {
    const id = requestAnimationFrame(() => setReady(true));
    return () => cancelAnimationFrame(id);
  }, []);
  const toggleRail = useCallback(() => {
    setCollapsed((c) => {
      const next = !c;
      try { document.cookie = `adm_side=${next ? "1" : "0"}; path=/admin; max-age=31536000; samesite=lax`; } catch {}
      return next;
    });
  }, []);
  // Tiroir mobile : Échap pour fermer, et la page derrière ne défile pas tant qu'il est ouvert.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    document.addEventListener("keydown", onKey);
    const prev = document.documentElement.style.overflow;
    document.documentElement.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.documentElement.style.overflow = prev; };
  }, [open]);
  const active = (href: string) => (href === "/admin" ? path === "/admin" : path === href || path.startsWith(`${href}/`));

  return (
    <div className="admx" data-open={open} data-collapsed={collapsed} data-ready={ready}>
      <aside className="admx__side">
        <div className="admx__brand">
          <Link href="/admin" onClick={() => setOpen(false)} aria-label="ESSNC, administration"><span className="admx__wordmark">ESSNC</span><span className="admx__mono" aria-hidden="true">E</span><em>Administration</em></Link>
          <button type="button" className="admx__rail" aria-label={collapsed ? "Déplier le menu" : "Replier le menu"} aria-expanded={!collapsed} aria-controls="admx-panel" onClick={toggleRail}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3.5" y="4.5" width="17" height="15" rx="1" /><path d="M9.5 4.5v15" /><path className="admx__chev" d="m15.5 9.5-2.5 2.5 2.5 2.5" /></svg>
          </button>
          <button type="button" className="admx__burger" aria-label={open ? "Fermer le menu" : "Ouvrir le menu"} aria-expanded={open} aria-controls="admx-panel" onClick={() => setOpen((o) => !o)}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path className="admx__l1" d="M4 8h16" /><path className="admx__l2" d="M4 16h16" /></svg>
          </button>
        </div>
        <div className="admx__scrim" onClick={() => setOpen(false)} aria-hidden="true" />

        <div className="admx__panel" id="admx-panel">

        <nav className="admx__nav" aria-label="Administration">
          {ITEMS.map((g) => (
            <div key={g.group} className="admx__group">
              <p>{g.group}</p>
              {g.items.map((it) => (
                <Link key={it.href} href={it.href} title={collapsed ? it.label : undefined} className="admx__link" data-active={active(it.href)} aria-current={active(it.href) ? "page" : undefined} onClick={() => setOpen(false)}>
                  {it.icon}
                  <span><b>{it.label}</b><small>{it.hint}</small></span>
                  {badges[it.href] > 0 && <i className="admx__badge">{badges[it.href]}</i>}
                </Link>
              ))}
            </div>
          ))}
          <div className="admx__group">
            <p>Raccourcis</p>
            {LINKS.map((l) => (
              <a key={l.href} href={l.href} title={collapsed ? l.label : undefined} className="admx__link admx__link--ext" {...(l.ext ? { target: "_blank", rel: "noreferrer" } : {})}>
                {l.icon}<span><b>{l.label}</b></span>
              </a>
            ))}
          </div>
        </nav>

        <div className="admx__user">
          <p className="admx__mail">Connecté : {email}</p>
          <button type="button" className="admx__out" onClick={signOut} disabled={leaving} title={collapsed ? "Se déconnecter" : undefined}>
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 5H6.5v14H14M10 12h10M16.5 8.5 20 12l-3.5 3.5" /></svg>
            <span>{leaving ? "Déconnexion…" : "Se déconnecter"}</span>
          </button>
        </div>
        </div>
      </aside>
      <div className="admx__main">{children}</div>
    </div>
  );
}
