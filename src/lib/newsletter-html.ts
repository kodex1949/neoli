export const SITE_URL = "https://neoli-nu.vercel.app";

export type NlBlock =
  | { id: string; type: "title"; text: string }
  | { id: string; type: "text"; text: string }
  | { id: string; type: "image"; url: string; alt: string; href: string }
  | { id: string; type: "button"; label: string; href: string }
  | { id: string; type: "divider" };

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const multi = (s: string) => esc(s).replace(/\r?\n/g, "<br>");
/** Lien sûr : https:// ou chemin du site ; sinon vide. */
export const safeLink = (h: string) => {
  const v = (h || "").trim();
  if (/^https:\/\//i.test(v)) return v;
  if (v.startsWith("/") && !v.startsWith("//")) return SITE_URL + v;
  return "";
};

const FONT = "Georgia,'Times New Roman',serif";
const SANS = "Helvetica,Arial,sans-serif";

function block(b: NlBlock): string {
  switch (b.type) {
    case "title":
      return `<tr><td style="padding:32px 40px 8px;font-family:${FONT};font-size:28px;line-height:34px;font-weight:400;color:#111;text-align:center">${multi(b.text)}</td></tr>`;
    case "text":
      return `<tr><td style="padding:12px 40px;font-family:${SANS};font-size:15px;line-height:24px;color:#333;text-align:center">${multi(b.text)}</td></tr>`;
    case "image": {
      if (!b.url) return "";
      const img = `<img src="${esc(b.url)}" alt="${esc(b.alt)}" width="600" style="display:block;width:100%;max-width:600px;height:auto;border:0">`;
      const l = safeLink(b.href);
      return `<tr><td style="padding:16px 0 0">${l ? `<a href="${esc(l)}">${img}</a>` : img}</td></tr>`;
    }
    case "button": {
      const l = safeLink(b.href);
      if (!b.label || !l) return "";
      return `<tr><td align="center" style="padding:20px 40px 28px"><a href="${esc(l)}" style="display:inline-block;padding:13px 32px;background:#111;color:#fff;font-family:${SANS};font-size:13px;letter-spacing:.06em;text-decoration:none">${esc(b.label)}</a></td></tr>`;
    }
    case "divider":
      return `<tr><td style="padding:16px 40px"><div style="border-top:1px solid #e5e5e5;height:1px;line-height:1px">&nbsp;</div></td></tr>`;
  }
}

/** E-mail HTML (tableaux + styles en ligne, compatible messageries). {{unsubscribe_url}} est à remplacer par votre outil d'envoi. */
export function renderNewsletter(subject: string, preheader: string, blocks: NlBlock[]): string {
  return `<!doctype html>
<html lang="fr"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${esc(subject)}</title></head>
<body style="margin:0;padding:0;background:#f4f2f0">
<div style="display:none;max-height:0;overflow:hidden;opacity:0">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f2f0"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:#fff">
<tr><td align="center" style="padding:32px 40px 8px;font-family:${FONT};font-size:22px;letter-spacing:.32em;color:#111"><a href="${SITE_URL}" style="color:#111;text-decoration:none">ESSNC</a></td></tr>
${blocks.map(block).join("\n")}
<tr><td style="padding:32px 40px;font-family:${SANS};font-size:11px;line-height:17px;color:#888;text-align:center;border-top:1px solid #eee">Vous recevez cet e-mail car vous êtes inscrit(e) à la newsletter ESSNC.<br><a href="{{unsubscribe_url}}" style="color:#888">Se désinscrire</a></td></tr>
</table></td></tr></table></body></html>`;
}

/** Retire scripts, iframes et attributs on* d'un HTML importé (un e-mail n'en a pas besoin). */
export const cleanHtml = (h: string) => h
  .replace(/<script[\s\S]*?<\/script\s*>/gi, "")
  .replace(/<(iframe|object|embed)[\s\S]*?<\/\1\s*>/gi, "")
  .replace(/\son[a-z]+\s*=\s*("[^"]*"|'[^']*'|[^\s>]+)/gi, "");
