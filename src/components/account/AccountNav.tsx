"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useMemo } from "react";
import { createClient } from "@/lib/supabase/client";

const P = { fill: "none", stroke: "currentColor", strokeWidth: 1.3, strokeLinecap: "round", strokeLinejoin: "round" } as const;
const ICONS: Record<string, React.ReactNode> = {
  home: <path d="M4 11l8-6.5 8 6.5M6 9.8V19h12V9.8" />,
  user: <><circle cx="12" cy="8.5" r="3.5" /><path d="M5 19.5c.8-3.4 3.6-5 7-5s6.2 1.6 7 5" /></>,
  bag: <><path d="M5.5 8.5h13l-1 11h-11z" /><path d="M9 8.5V7a3 3 0 016 0v1.5" /></>,
  heart: <path d="M12 19.5s-7-4.4-7-9.6A3.9 3.9 0 0112 8a3.9 3.9 0 017 1.9c0 5.2-7 9.6-7 9.6z" />,
  pin: <><path d="M12 20s6-5.2 6-10a6 6 0 10-12 0c0 4.8 6 10 6 10z" /><circle cx="12" cy="10" r="2.2" /></>,
  lock: <><rect x="5.5" y="10.5" width="13" height="9" /><path d="M8.5 10.5V8a3.5 3.5 0 017 0v2.5" /></>,
  star: <path d="M12 4.5l2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5L4.8 9.8l5-.7z" />,
  gift: <><rect x="4.5" y="9" width="15" height="10.5" /><path d="M4.5 12.5h15M12 9v10.5M12 9c-1-3-5-3.5-5-1.2C7 9 9 9 12 9zm0 0c1-3 5-3.5 5-1.2C17 9 15 9 12 9z" /></>,
  drop: <path d="M12 4.5c3 3.6 5.5 6.2 5.5 9.2a5.5 5.5 0 11-11 0c0-3 2.5-5.6 5.5-9.2z" />,
  out: <><path d="M10 5H5.5v14H10" /><path d="M14 8.5l3.5 3.5-3.5 3.5M17.5 12H9.5" /></>,
};
const Icon = ({ k }: { k: string }) => <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true" {...P}>{ICONS[k]}</svg>;

const LINKS = [
  { href: "/compte", label: "Vue d'ensemble", icon: "home" },
  { href: "/compte/commandes", label: "Mes commandes", icon: "bag" },
  { href: "/compte/avantages", label: "Mes avantages", icon: "star" },
  { href: "/compte/parrainage", label: "Parrainage", icon: "gift" },
  { href: "/compte/favoris", label: "Mes favoris", icon: "heart" },
  { href: "/compte/profil-olfactif", label: "Profil olfactif", icon: "drop" },
  { href: "/compte/informations", label: "Mes informations", icon: "user" },
  { href: "/compte/adresses", label: "Mes adresses", icon: "pin" },
  { href: "/compte/securite", label: "Connexion et sécurité", icon: "lock" },
];

export function AccountNav({ name, email }: { name: string; email: string }) {
  const path = usePathname();
  const router = useRouter();
  const supabase = useMemo(() => createClient(), []);
  const signOut = async () => {
    await supabase.auth.signOut();
    router.replace("/");
    router.refresh();
  };
  const initials = name.split(" ").map((w) => w[0]).slice(0, 2).join("").toUpperCase() || "M";
  return (
    <aside className="acct__nav">
      <div className="acct__who">
        <span className="acct__avatar" aria-hidden="true">{initials}</span>
        <div><strong>{name}</strong><span>{email}</span></div>
      </div>
      <nav aria-label="Espace compte">
        {LINKS.map((l) => (
          <Link key={l.href} href={l.href} aria-current={path === l.href ? "page" : undefined}>
            <Icon k={l.icon} />
            <span>{l.label}</span>
          </Link>
        ))}
        <button type="button" className="acct__out" onClick={signOut}>
          <Icon k="out" />
          <span>Se déconnecter</span>
        </button>
      </nav>
    </aside>
  );
}
