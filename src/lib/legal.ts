// Contenus légaux : les champs [À COMPLÉTER] doivent être renseignés par l'exploitant avant l'ouverture.
export type LegalPage = { title: string; lead: string; sections: { h: string; p: string[] }[] };

export const LEGAL: Record<string, LegalPage> = {
  "mentions-legales": {
    title: "Mentions légales",
    lead: "Informations légales relatives au site Néoli.",
    sections: [
      { h: "Éditeur du site", p: ["Néoli — [À COMPLÉTER : forme juridique, capital, RCS/SIRET, adresse du siège].", "Directeur de la publication : [À COMPLÉTER]. Contact : contact@neoli.example."] },
      { h: "Hébergement", p: ["Le site est hébergé par Vercel Inc., 440 N Barranca Ave #4133, Covina, CA 91723, États-Unis."] },
      { h: "Propriété intellectuelle", p: ["L'ensemble des contenus du site (textes, images, marques, logos) est protégé. Toute reproduction sans autorisation écrite préalable est interdite."] },
    ],
  },
  confidentialite: {
    title: "Politique de vie privée",
    lead: "Comment Néoli collecte et protège vos données personnelles.",
    sections: [
      { h: "Données collectées", p: ["Nous collectons les données nécessaires à votre compte et à vos commandes : identité, e-mail, adresses, téléphone, historique de commandes et préférences olfactives."] },
      { h: "Finalités", p: ["Gestion des commandes et de la livraison, service client, programme de fidélité et de parrainage, et, avec votre accord, communications commerciales."] },
      { h: "Conservation et partage", p: ["Vos données sont conservées pendant la durée de la relation commerciale puis selon les obligations légales. Elles sont traitées par nos prestataires techniques (Shopify, Supabase, Vercel) et ne sont jamais vendues."] },
      { h: "Vos droits", p: ["Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, d'effacement, d'opposition et de portabilité. Écrivez-nous à contact@neoli.example. Vous pouvez aussi saisir la CNIL (cnil.fr)."] },
    ],
  },
  conditions: {
    title: "Conditions générales de vente",
    lead: "Conditions applicables aux commandes passées sur le site Néoli.",
    sections: [
      { h: "Produits et prix", p: ["Les prix sont indiqués en euros, toutes taxes comprises, hors frais de livraison. Néoli se réserve le droit de modifier ses prix à tout moment ; le prix applicable est celui affiché lors de la validation de la commande."] },
      { h: "Commande et paiement", p: ["La commande est confirmée après validation du paiement, effectué de façon sécurisée. Un e-mail de confirmation vous est adressé."] },
      { h: "Livraison", p: ["Voir la page Livraison."] },
      { h: "Rétractation et retours", p: ["Vous disposez de 14 jours pour exercer votre droit de rétractation. Voir la page Retours et rétractation."] },
      { h: "Garanties et litiges", p: ["Les produits bénéficient des garanties légales. En cas de litige, vous pouvez recourir à un médiateur de la consommation : [À COMPLÉTER : nom et coordonnées du médiateur]. Droit français applicable."] },
    ],
  },
  livraison: {
    title: "Livraison",
    lead: "Délais et frais de livraison.",
    sections: [
      { h: "Frais", p: ["Livraison offerte dès 100 € d'achat. En dessous, les frais sont indiqués lors de la commande."] },
      { h: "Délais", p: ["Les commandes sont préparées sous [À COMPLÉTER] jours ouvrés, puis livrées selon le mode choisi. Vous recevez un e-mail de suivi dès l'expédition."] },
    ],
  },
  retours: {
    title: "Retours et rétractation",
    lead: "Vous avez changé d'avis ? Voici comment faire.",
    sections: [
      { h: "Délai de 14 jours", p: ["Vous pouvez vous rétracter sans motif dans les 14 jours suivant la réception de votre commande. Les produits doivent être retournés non ouverts, dans leur emballage d'origine."] },
      { h: "Comment procéder", p: ["Écrivez-nous à contact@neoli.example en indiquant votre numéro de commande. Le remboursement intervient sous 14 jours après réception du retour. Les produits d'hygiène ou de soin descellés ne peuvent être repris."] },
    ],
  },
};
