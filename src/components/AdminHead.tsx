/** En-tête commun des pages d'administration : petit titre, grand titre serif, texte d'aide. */
export function AdminHead({ eyebrow, title, lead }: { eyebrow: string; title: string; lead?: string }) {
  return (
    <header className="admp__head">
      <p className="admh__eyebrow">{eyebrow}</p>
      <h1 className="admh__title">{title}</h1>
      {lead && <p className="admh__lead">{lead}</p>}
    </header>
  );
}

export type AdminStat = { label: string; value: string | number; note?: string; hot?: boolean };

/** Bandeau de chiffres clés (même rendu que le tableau de bord). */
export function AdminStats({ items }: { items: AdminStat[] }) {
  return (
    <section className="admh__stats admp__stats" style={{ ["--n" as string]: items.length }} aria-label="Chiffres clés">
      {items.map((s) => (
        <div key={s.label} className="admh__stat">
          <span className="admh__stat-label">{s.label}</span>
          <strong data-hot={s.hot ? "true" : undefined}>{s.value}</strong>
          {s.note && <em>{s.note}</em>}
        </div>
      ))}
    </section>
  );
}
