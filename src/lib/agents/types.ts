export type AgentId =
  | "store-manager" | "product-manager" | "seo-specialist" | "inventory-manager" | "pricing-manager"
  | "order-manager" | "customer-support" | "marketing-manager" | "analytics-specialist" | "technical-quality";

/** READ ONLY : analyse seule · APPROVAL REQUIRED : actions préparées puis validées · AUTO EXECUTE : uniquement les actions explicitement autorisées et à faible risque. */
export type Mode = "read_only" | "approval_required" | "auto_execute";
export type Severity = "info" | "warning" | "critical";

export type Permission =
  // lectures
  | "shopify.storefront.read" | "shopify.admin.orders.read" | "shopify.admin.inventory.read" | "site.http.read" | "supabase.read"
  // écritures (aucune n'est implémentée à ce jour : elles sont refusées ou soumises à validation)
  | "shopify.admin.products.write" | "shopify.admin.prices.write" | "shopify.admin.orders.write" | "email.send" | "ads.spend" | "deploy.production" | "supply.order";

export type ProposedAction = { type: string; params: Record<string, unknown> };

export type Finding = {
  key: string; // stable : sert à éviter les doublons d'un jour à l'autre
  severity: Severity;
  title: string;
  detail: string;
  data?: Record<string, unknown>;
  proposedAction?: ProposedAction;
};

export type AgentDef = {
  id: AgentId;
  name: string;
  role: string;
  /** false tant que l'agent ne peut pas réellement exécuter ses tâches. */
  implemented: boolean;
  reads: Permission[];
  writes: Permission[];
  autoAllowed: Permission[];
  triggers: string[];
  dependsOn: AgentId[];
  limits: string; // règle métier inviolable, reprise dans le fichier .claude/agents
};

export type Decision = "allow" | "needs_approval" | "deny";
