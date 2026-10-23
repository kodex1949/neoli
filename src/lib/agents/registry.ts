import type { AgentDef, AgentId } from "./types";

const R = { sf: "shopify.storefront.read", ord: "shopify.admin.orders.read", inv: "shopify.admin.inventory.read", http: "site.http.read", db: "supabase.read" } as const;

export const AGENTS: AgentDef[] = [
  { id: "store-manager", name: "Store Manager", role: "Orchestrateur principal : priorise, vérifie, produit le rapport quotidien", implemented: true,
    reads: [R.db], writes: [], autoAllowed: [], triggers: ["daily", "manual"], dependsOn: ["product-manager", "seo-specialist", "analytics-specialist", "technical-quality", "inventory-manager", "pricing-manager", "order-manager", "customer-support", "marketing-manager"],
    limits: "Ne modifie jamais le travail d'un autre agent ; synthétise seulement." },
  { id: "product-manager", name: "Product Manager", role: "Qualité du catalogue", implemented: true,
    reads: [R.sf], writes: ["shopify.admin.products.write"], autoAllowed: [], triggers: ["daily", "manual", "product.created", "product.updated"], dependsOn: [],
    limits: "Prépare les modifications ; aucune écriture tant que le mode n'est pas APPROVAL REQUIRED ou plus." },
  { id: "seo-specialist", name: "SEO Specialist", role: "Référencement naturel", implemented: true,
    reads: [R.http, R.sf], writes: [], autoAllowed: [], triggers: ["daily", "manual"], dependsOn: [],
    limits: "Cherche des améliorations mesurables ; ne promet aucun classement Google." },
  { id: "inventory-manager", name: "Inventory Manager", role: "Stocks et réapprovisionnement", implemented: true,
    reads: [R.inv, R.sf], writes: ["supply.order"], autoAllowed: [], triggers: ["inventory.low", "daily"], dependsOn: [],
    limits: "Ne commande jamais de marchandises sans autorisation." },
  { id: "pricing-manager", name: "Pricing & Profit Manager", role: "Prix et rentabilité", implemented: true,
    reads: [R.sf, R.ord], writes: ["shopify.admin.prices.write"], autoAllowed: [], triggers: ["daily", "manual"], dependsOn: [],
    limits: "N'invente jamais un prix d'achat, des frais ou une marge ; tout changement de prix est validé." },
  { id: "order-manager", name: "Order Manager", role: "Commandes et livraisons", implemented: true,
    reads: [R.ord], writes: ["shopify.admin.orders.write"], autoAllowed: [], triggers: ["order.created", "order.cancelled", "daily"], dependsOn: [],
    limits: "Ne modifie aucun paiement, n'annule ni ne rembourse sans autorisation explicite." },
  { id: "customer-support", name: "Customer Support", role: "Service client", implemented: true,
    reads: [R.db], writes: ["email.send"], autoAllowed: [], triggers: ["customer.request"], dependsOn: [],
    limits: "Respect du RGPD ; toute réponse externe est validée avant envoi." },
  { id: "marketing-manager", name: "Marketing Manager", role: "Croissance et fidélisation", implemented: true,
    reads: [R.sf, R.ord, R.db], writes: ["email.send", "ads.spend"], autoAllowed: [], triggers: ["daily", "manual"], dependsOn: [],
    limits: "Aucune dépense publicitaire ni communication commerciale sans autorisation." },
  { id: "analytics-specialist", name: "Analytics Specialist", role: "Ventes et tendances", implemented: true,
    reads: [R.ord], writes: [], autoAllowed: [], triggers: ["daily", "manual"], dependsOn: [],
    limits: "Ne fabrique aucune statistique ; indique ce qui est indisponible." },
  { id: "technical-quality", name: "Technical & Quality", role: "Disponibilité, intégrations et performances", implemented: true,
    reads: [R.http, R.sf, R.ord, R.db], writes: ["deploy.production"], autoAllowed: [], triggers: ["daily", "manual", "site.error"], dependsOn: [],
    limits: "Aucun déploiement en production sans validation." },
];

export const byId = (id: AgentId | string) => AGENTS.find((a) => a.id === id);
