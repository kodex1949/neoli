import Link from "next/link";
import { Newsletter } from "./Newsletter";
import { RevealOnScroll } from "./RevealOnScroll";

const d = (n: number) => ({ "--d": n }) as React.CSSProperties;

/** Bandeau de services : icône + titre + une ligne. À garder alignées avec les vraies conditions (pages /info/livraison et /info/retours). */
const services: { title: string; text: string; href?: string; icon: React.ReactNode }[] = [
  { title: "Livraison offerte dès 100 €", text: "Colis suivi, expédié avec soin.", href: "/info/livraison",
    icon: <><path d="M2.5 7h11v9h-11z" /><path d="M13.5 10h4l3 3v3h-7" /><circle cx="7" cy="17.5" r="1.7" /><circle cx="17" cy="17.5" r="1.7" /></> },
  { title: "Paiement sécurisé", text: "Règlement chiffré, par carte ou portefeuille.",
    icon: <><rect x="4.5" y="10.5" width="15" height="10" rx="1.5" /><path d="M8 10.5V8a4 4 0 0 1 8 0v2.5" /></> },
  { title: "Retours sous 14 jours", text: "Rétractation simple, selon nos conditions.", href: "/info/retours",
    icon: <><path d="M4.5 9.5V5.5h4" /><path d="M4.8 9.2A8 8 0 1 1 4 13" /></> },
  { title: "Un conseil, une question ?", text: "Écrivez-nous, nous répondons par e-mail.", href: "mailto:contact@essnc.example",
    icon: <><path d="M4 6.5h16v11H4z" /><path d="m4.5 7 7.5 6 7.5-6" /></> },
];

const perks = [
  { title: "Avantages e-boutique", text: "Échantillons et miniatures offerts avec vos commandes.", href: "/collections/idees-cadeaux" },
  { title: "Exclusivité", text: "Découvrez nos coffrets en édition très limitée.", href: "/collections/exclusifs" },
  { title: "Cercle ESSNC", text: "Gagnez des points à chaque achat et profitez d'avantages réservés aux membres.", href: "/compte/avantages" },
];

const cols: { title: string; links: { label: string; href: string }[] }[] = [
  { title: "Trouver une boutique", links: [{ label: "Nos boutiques", href: "#" }, { label: "Prendre rendez-vous", href: "#" }, { label: "Conseil olfactif", href: "/conseil-olfactif" }] },
  { title: "Service client", links: [{ label: "Contact", href: "mailto:contact@essnc.example" }, { label: "Livraison", href: "/info/livraison" }, { label: "Retours et rétractation", href: "/info/retours" }, { label: "FAQ", href: "/info/faq" }, { label: "La carte cadeau", href: "#" }] },
  { title: "ESSNC", links: [{ label: "Notre histoire", href: "#" }, { label: "Engagements", href: "#" }, { label: "Carrières", href: "#" }, { label: "Presse", href: "#" }] },
  { title: "Légal", links: [{ label: "Mentions légales", href: "/info/mentions-legales" }, { label: "Politique de vie privée", href: "/info/confidentialite" }, { label: "Conditions générales de vente", href: "/info/conditions" }, { label: "Accessibilité", href: "#" }, { label: "Préférences de cookies", href: "#" }] },
];

const social = ["Instagram", "TikTok", "Facebook", "Pinterest", "YouTube"];

export function Footer() {
  return (
    <footer className="footer">
      <RevealOnScroll />
      <div className="footer__card">
        <ul className="footer__services" aria-label="Nos services">
          {services.map((v, k) => {
            const body = (
              <>
                <svg viewBox="0 0 24 24" aria-hidden="true">{v.icon}</svg>
                <span><strong>{v.title}</strong><em>{v.text}</em></span>
              </>
            );
            return (
              <li key={v.title} data-reveal="up" style={d(k)}>
                {v.href ? <Link href={v.href} className="footer__service">{body}</Link> : <div className="footer__service">{body}</div>}
              </li>
            );
          })}
        </ul>
        <div className="footer__rule footer__rule--top" data-reveal="line" />

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
          <Link href="/" className="footer__logo" aria-label="Accueil">ESSNC</Link>
          <button type="button" className="footer__country">
            <span>Pays ou région &amp; langue<br /><b>France (Français)</b></span>
            <svg viewBox="0 0 8 12" aria-hidden="true"><path d="m1.5 1 5 5-5 5" /></svg>
          </button>
        </div>
      </div>
      <p className="footer__legal" data-reveal="fade">© {new Date().getFullYear()} ESSNC. Tous droits réservés.</p>
    </footer>
  );
}
