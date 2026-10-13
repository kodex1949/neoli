
// Commandes d'un client, lues côté serveur avec l'API Admin de Shopify (jeton secret, jamais envoyé au navigateur).
// L'e-mail vient de la session Supabase : on ne lit que les commandes de l'adresse de la personne connectée (et confirmée).
const domain = process.env.SHOPIFY_STORE_DOMAIN;
const staticToken = process.env.SHOPIFY_ADMIN_TOKEN; // ancien format : jeton « shpat_ » d'une appli personnalisée
const clientId = process.env.SHOPIFY_ADMIN_CLIENT_ID; // Dev Dashboard : identifiant client + secret
const clientSecret = process.env.SHOPIFY_ADMIN_CLIENT_SECRET;
const version = process.env.SHOPIFY_API_VERSION ?? "2025-07";

export const adminConfigured = Boolean(domain && (staticToken || (clientId && clientSecret)));

// Jeton temporaire obtenu avec l'identifiant client + le secret (« client credentials », valable 24 h), gardé en mémoire du serveur
let cached: { token: string; exp: number } | null = null;
async function adminToken(): Promise<string> {
  if (staticToken) return staticToken;
  if (cached && cached.exp > Date.now() + 60_000) return cached.token;
  const res = await fetch(`https://${domain}/admin/oauth/access_token`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: clientId, client_secret: clientSecret, grant_type: "client_credentials" }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shopify token ${res.status}`);
  const j = (await res.json()) as { access_token: string; expires_in?: number };
  cached = { token: j.access_token, exp: Date.now() + (j.expires_in ?? 86_400) * 1000 };
  return cached.token;
}

export type OrderLine = {
  title: string;
  variantTitle?: string;
  quantity: number;
  image?: string;
  variantId?: string;
  handle?: string;
  unitPrice: string;
};

export type Order = {
  id: string;
  name: string; // « #1001 »
  date: string; // ISO
  total: string; // formaté
  amount: number; // montant numérique (fidélité)
  payment: string; // libellé français
  delivery: string; // libellé français
  deliveryCode: string;
  statusUrl?: string; // page de suivi / facture Shopify
  tracking: { company?: string; number?: string; url?: string }[];
  stage: 1 | 2 | 3 | 4; // 1 confirmée · 2 en préparation · 3 expédiée · 4 livrée
  stageLabel: string;
  eta?: string; // livraison estimée (ISO)
  deliveredAt?: string;
  shippedAt?: string;
  lines: OrderLine[];
};

const QUERY = /* GraphQL */ `
  query Orders($q: String!) {
    orders(first: 25, query: $q, sortKey: PROCESSED_AT, reverse: true) {
      nodes {
        id
        name
        processedAt
        displayFinancialStatus
        displayFulfillmentStatus
        statusPageUrl
        currentTotalPriceSet { shopMoney { amount currencyCode } }
        fulfillments(first: 5) { displayStatus estimatedDeliveryAt deliveredAt createdAt trackingInfo(first: 3) { company number url } }
        lineItems(first: 30) {
          nodes {
            title
            variantTitle
            quantity
            image { url }
            product { handle }
            variant { id }
            originalUnitPriceSet { shopMoney { amount currencyCode } }
          }
        }
      }
    }
  }
`;

const money = (a: string, c: string) => new Intl.NumberFormat("fr-FR", { style: "currency", currency: c }).format(Number(a));

const PAYMENT: Record<string, string> = {
  PAID: "Payée", PENDING: "Paiement en attente", AUTHORIZED: "Paiement autorisé", PARTIALLY_PAID: "Partiellement payée",
  REFUNDED: "Remboursée", PARTIALLY_REFUNDED: "Partiellement remboursée", VOIDED: "Annulée", EXPIRED: "Expirée",
};
const DELIVERY: Record<string, string> = {
  FULFILLED: "Expédiée", UNFULFILLED: "En préparation", PARTIALLY_FULFILLED: "Partiellement expédiée", IN_PROGRESS: "En préparation",
  ON_HOLD: "En attente", SCHEDULED: "Programmée", OPEN: "En préparation", REQUEST_DECLINED: "En préparation", PENDING_FULFILLMENT: "En préparation", RESTOCKED: "Retournée",
};

type Node = {
  id: string; name: string; processedAt: string; displayFinancialStatus: string | null; displayFulfillmentStatus: string; statusPageUrl: string | null;
  currentTotalPriceSet: { shopMoney: { amount: string; currencyCode: string } };
  fulfillments: { displayStatus: string; estimatedDeliveryAt: string | null; deliveredAt: string | null; createdAt: string; trackingInfo: { company: string | null; number: string | null; url: string | null }[] }[];
  lineItems: { nodes: { title: string; variantTitle: string | null; quantity: number; image: { url: string } | null; product: { handle: string } | null; variant: { id: string } | null; originalUnitPriceSet: { shopMoney: { amount: string; currencyCode: string } } }[] };
};

const STAGE_LABEL: Record<string, string> = {
  OUT_FOR_DELIVERY: "En cours de livraison", IN_TRANSIT: "En transit", DELAYED: "Livraison retardée", ATTEMPTED_DELIVERY: "Tentative de livraison", READY_FOR_PICKUP: "Prête au retrait",
  PICKED_UP: "Retirée", DELIVERED: "Livrée", NOT_DELIVERED: "Non livrée", FAILURE: "Problème de livraison",
};

function stageOf(o: Node): Pick<Order, "stage" | "stageLabel" | "eta" | "deliveredAt" | "shippedAt"> {
  const f = o.fulfillments[o.fulfillments.length - 1];
  const st = f?.displayStatus ?? "";
  if (f?.deliveredAt || st === "DELIVERED" || st === "PICKED_UP") return { stage: 4, stageLabel: "Livrée", deliveredAt: f?.deliveredAt ?? undefined, shippedAt: f?.createdAt };
  if (f || o.displayFulfillmentStatus === "FULFILLED") return { stage: 3, stageLabel: STAGE_LABEL[st] ?? "Expédiée", eta: f?.estimatedDeliveryAt ?? undefined, shippedAt: f?.createdAt };
  return { stage: 2, stageLabel: "En préparation" };
}

export async function getOrdersByEmail(email: string): Promise<{ orders: Order[]; error?: "not_configured" | "failed"; detail?: string; denied?: boolean }> {
  if (!adminConfigured) return { orders: [], error: "not_configured" };
  try {
    const res = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": await adminToken() },
      body: JSON.stringify({ query: QUERY, variables: { q: `email:"${email.replace(/["\\]/g, "")}"` } }),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Shopify Admin ${res.status}`);
    const json = await res.json();
    // Droit « read_products » absent : on affiche quand même les commandes (sans le bouton « Racheter »)
    const fatal = (json.errors ?? []).filter((e: { extensions?: { code?: string } }) => e.extensions?.code !== "ACCESS_DENIED");
    if (fatal.length || !json.data?.orders) throw new Error(JSON.stringify(json.errors ?? "no data"));
    const nodes: Node[] = json.data.orders.nodes;
    return {
      denied: (json.errors ?? []).length > 0,
      orders: nodes.map((o) => ({
        id: o.id,
        name: o.name,
        date: o.processedAt,
        amount: Number(o.currentTotalPriceSet.shopMoney.amount) || 0,
        total: money(o.currentTotalPriceSet.shopMoney.amount, o.currentTotalPriceSet.shopMoney.currencyCode),
        payment: PAYMENT[o.displayFinancialStatus ?? ""] ?? "—",
        delivery: DELIVERY[o.displayFulfillmentStatus] ?? o.displayFulfillmentStatus,
        deliveryCode: o.displayFulfillmentStatus,
        ...stageOf(o),
        statusUrl: o.statusPageUrl ?? undefined,
        tracking: o.fulfillments.flatMap((f) => f.trackingInfo).filter((t) => t.number || t.url).map((t) => ({ company: t.company ?? undefined, number: t.number ?? undefined, url: t.url ?? undefined })),
        lines: o.lineItems.nodes.map((l) => ({
          title: l.title,
          variantTitle: l.variantTitle && l.variantTitle !== "Default Title" ? l.variantTitle : undefined,
          quantity: l.quantity,
          image: l.image?.url,
          variantId: l.variant?.id,
          handle: l.product?.handle,
          unitPrice: money(l.originalUnitPriceSet.shopMoney.amount, l.originalUnitPriceSet.shopMoney.currencyCode),
        })),
      })),
    };
  } catch (e) {
    console.error("[orders]", e);
    return { orders: [], error: "failed", detail: process.env.NODE_ENV !== "production" ? String((e as Error).message).slice(0, 600) : undefined };
  }
}

/** Requête GraphQL générique vers l'API Admin (lecture seule côté appelant : les agents n'utilisent que des « query »). */
export async function adminGraphQL<T>(query: string, variables: Record<string, unknown> = {}): Promise<{ data?: T; errors?: { message: string; extensions?: { code?: string } }[] }> {
  if (!adminConfigured) throw new Error("not_configured");
  if (/^\s*mutation\b/i.test(query)) throw new Error("mutations_forbidden");
  const res = await fetch(`https://${domain}/admin/api/${version}/graphql.json`, {
    method: "POST",
    headers: { "Content-Type": "application/json", "X-Shopify-Access-Token": await adminToken() },
    body: JSON.stringify({ query, variables }),
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Shopify Admin ${res.status}`);
  return res.json();
}
