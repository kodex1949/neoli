"use client";

import { useState } from "react";
import { useCart } from "@/lib/cart";
import type { Order } from "@/lib/shopify-admin";

const day = (d: string) => new Intl.DateTimeFormat("fr-FR", { weekday: "long", day: "numeric", month: "long" }).format(new Date(d));
const date = (d: string) => new Intl.DateTimeFormat("fr-FR", { day: "numeric", month: "long", year: "numeric" }).format(new Date(d));

export function OrderCard({ order }: { order: Order }) {
  const { add, openPanel } = useCart();
  const [done, setDone] = useState(false);

  const rebuy = () => {
    order.lines.forEach((l) => {
      if (!l.variantId || !l.handle) return;
      add({ id: l.variantId, handle: l.handle, title: l.title, price: l.unitPrice, image: l.image, variantId: l.variantId }, l.quantity);
    });
    setDone(true);
    openPanel();
    setTimeout(() => setDone(false), 3000);
  };
  const canRebuy = order.lines.some((l) => l.variantId && l.handle);
  const delivered = order.stage === 4;

  return (
    <article className="acct__card acct__order">
      <header className="acct__order-head">
        <div>
          <h2>Commande {order.name}</h2>
          <p>{date(order.date)}</p>
        </div>
        <p className="acct__order-total">{order.total}</p>
      </header>

      <div className="acct__badges">
        <span data-tone={delivered ? "ok" : "wait"}>{order.stageLabel}</span>
        <span data-tone={order.payment === "Payée" ? "ok" : "wait"}>{order.payment}</span>
      </div>

      <ol className="acct__steps" aria-label={`Suivi de la commande : ${order.stageLabel}`}>
        {[
          { n: 1, t: "Confirmée", d: date(order.date) },
          { n: 2, t: "En préparation" },
          { n: 3, t: "Expédiée", d: order.shippedAt ? date(order.shippedAt) : undefined },
          { n: 4, t: "Livrée", d: order.deliveredAt ? date(order.deliveredAt) : undefined },
        ].map((s) => (
          <li key={s.n} data-state={s.n < order.stage || (s.n === order.stage && order.stage === 4) ? "done" : s.n === order.stage ? "current" : "todo"}>
            <i aria-hidden="true" />
            <strong>{s.n === 3 && order.stage === 3 ? order.stageLabel : s.t}</strong>
            {s.d && <span>{s.d}</span>}
          </li>
        ))}
      </ol>
      {order.stage === 3 && order.eta && <p className="acct__eta">Livraison estimée : <strong>{day(order.eta)}</strong></p>}

      <ul className="acct__lines">
        {order.lines.map((l, i) => (
          <li key={i}>
            <span className="acct__thumb">{l.image && /* eslint-disable-next-line @next/next/no-img-element */ <img src={l.image} alt="" />}</span>
            <span className="acct__line-info">
              <strong>{l.title}</strong>
              <span>{[l.variantTitle, `Quantité : ${l.quantity}`].filter(Boolean).join(" · ")}</span>
            </span>
          </li>
        ))}
      </ul>

      {order.tracking.length > 0 && (
        <ul className="acct__track">
          {order.tracking.map((t, i) => (
            <li key={i}>
              <span>Colis {t.company ? `${t.company} ` : ""}{t.number ? `n° ${t.number}` : ""}</span>
              {t.number && <button type="button" onClick={() => navigator.clipboard?.writeText(t.number!)}>Copier le numéro</button>}
              {t.url && <a href={t.url} target="_blank" rel="noopener noreferrer">Suivre le colis</a>}
            </li>
          ))}
        </ul>
      )}

      <div className="acct__actions acct__actions--row">
        {canRebuy && <button type="button" className="acct__btn" data-primary="true" onClick={rebuy}>{done ? "Ajouté au panier" : "Racheter"}</button>}
        {order.statusUrl && <a className="acct__btn" href={order.statusUrl} target="_blank" rel="noopener noreferrer">Détails et facture</a>}
      </div>
    </article>
  );
}
