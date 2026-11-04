/** Clé du constat sans le jour : regroupe les répétitions quotidiennes d'un même constat. */
export const groupKey = (dedupe: string | null, fallback: string) => (dedupe ?? fallback).replace(/:\d{4}-\d{2}-\d{2}(T\d{2})?$/, "");
