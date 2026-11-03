-- PROPOSÉE — NON APPLIQUÉE. Non destructive. À relire (RLS) avant exécution.
create table if not exists public.agent_missions (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  objective text,
  owner_agent text references public.agents(id),
  status text not null default 'BACKLOG' check (status in ('BACKLOG','READY','RUNNING','REVIEW','APPROVAL_REQUIRED','COMPLETED','BLOCKED','FAILED')),
  budget_cents integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create table if not exists public.agent_metrics (
  id bigserial primary key,
  agent_id text references public.agents(id),
  name text not null,
  value numeric,
  source text not null,           -- origine réelle de la mesure
  measured_at timestamptz not null default now()
);
create table if not exists public.agent_incidents (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  severity text not null check (severity in ('info','warning','critical')),
  timeline jsonb not null default '[]',
  cause text, fix text, prevention text,
  status text not null default 'open' check (status in ('open','resolved')),
  created_at timestamptz not null default now()
);
alter table public.agent_missions  enable row level security;
alter table public.agent_metrics   enable row level security;
alter table public.agent_incidents enable row level security;
-- Aucune politique pour anon/authenticated : accès uniquement via la clé service (moteur).
-- Ajouter des politiques pour agent_admins après revue des politiques existantes (F-02).
revoke all on public.agent_missions, public.agent_metrics, public.agent_incidents from anon, authenticated;
