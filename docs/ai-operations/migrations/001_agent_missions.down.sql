-- Retour arrière de 001 (supprime des tables VIDES créées par 001 ; vérifier avant).
drop table if exists public.agent_incidents;
drop table if exists public.agent_metrics;
drop table if exists public.agent_missions;
