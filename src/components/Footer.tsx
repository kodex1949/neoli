import Link from "next/link";
import { Newsletter } from "./Newsletter";
import { RevealOnScroll } from "./RevealOnScroll";

const d = (n: number) => ({ "--d": n }) as React.CSSProperties;

const perks = [
  { title: "Avantages e-boutique", text: "Livraison offerte dès 100 €, échantillons et miniatures offerts.", href: "/collections/cadeaux" },
  { title: "Exclusivité", text: "Découvrez nos coffrets en édition très limitée.", href: "/collections/exclusifs" },
  { title: "Cercle Néoli", text: "Gagnez des points à chaque achat et profitez d'avantages réservés aux membres.", href: "/compte/avantages" },
];

const cols: { title: string; links: { label: string; href: string }[] }[] = [
  { title: "Trouver une boutique", links: [{ label: "Nos boutiques", href: "#" }, { label: "Prendre rendez-vous", href: "#" }, { label: "Conseil olfactif", href: "/conseil-olfactif" }] },
  { title: "Service client", links: [{ label: "Contact", href: "mailto:contact@neoli.example" }, { label: "Livraison", href: "#" }, { label: "Retours et rétractation", href: "#" }, { label: "FAQ", href: "#" }, { label: "La carte cadeau", href: "#" }] },
  { title: "Néoli", links: [{ label: "Notre histoire", href: "#" }, { label: "Engagements", href: "#" }, { label: "Carrières", href: "#" }, { label: "Presse", href: "#" }] },
  { title: "Légal", links: [{ label: "Mentions légales", href: "#" }, { label: "Politique de vie privée", href: "#" }, { label: "Conditions générales de vente", href: "#" }, { label: "Accessibilité", href: "#" }, { label: "Préférences de cookies", href: "#" }] },
];

const social = ["Instagram", "TikTok", "Facebook", "Pinterest", "YouTube"];

export function Footer() {
  return (
    <footer className="footer">
      <RevealOnScroll />
      <div className="footer__card">
        <ul className="footer__perks">
          {perks.map((p, k) => (
            <li key={p.title} data-reveal="up" style={d(k)}>
              <Link href={p.href} className="footer__perk">
                <span>
                  <strong>{p.title}</strong>
                  <span>{p.text}</span>
                </span>
                <svg viewBox="0 0 8 12" aria-hidden="true"><path d="m1.5 1 5 5-5 5" /></svg>
              </Link>
            </li>
          ))}
        </ul>

        <div className="footer__rule" data-reveal="line" />
        <div data-reveal="up"><Newsletter /></div>

        <nav className="footer__cols" aria-label="Pied de page">
          {cols.map((c, k) => (
            <div key={c.title} data-reveal="up" style={d(k)}>
              <h2>{c.title}</h2>
              <ul>
                {c.links.map((l) => (
                  <li key={l.label}><Link href={l.href}>{l.label}</Link></li>
                ))}
              </ul>
            </div>
          ))}
        </nav>

        <div className="footer__bottom" data-reveal="up">
          <div className="footer__social">
            <p>Suivez-nous :</p>
            <ul>
              {social.map((s) => <li key={s}><Link href="#">{s}</Link></li>)}
            </ul>
          </div>
          <Link href="/" className="footer__logo" aria-label="Accueil">Néoli</Link>
          <button type="button" className="footer__country">
            <span>Pays ou région &amp; langue<br /><b>France (Français)</b></span>
            <svg viewBox="0 0 8 12" aria-hidden="true"><path d="m1.5 1 5 5-5 5" /></svg>
          </button>
        </div>
      </div>
      <p className="footer__legal" data-reveal="fade">© {new Date().getFullYear()} Néoli. Tous droits réservés.</p>
    </footer>
  );
}
