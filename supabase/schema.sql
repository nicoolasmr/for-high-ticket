create table if not exists public.workspaces (
  id text primary key,
  name text not null
);

create table if not exists public.users (
  id text primary key,
  name text not null,
  email text not null unique,
  password_hash text not null
);

create table if not exists public.workspace_memberships (
  id bigint generated always as identity primary key,
  user_id text not null references public.users(id) on delete cascade,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  role text not null,
  status text not null default 'active',
  unique (user_id, workspace_id)
);

create table if not exists public.sessions (
  token text primary key,
  user_id text not null references public.users(id) on delete cascade,
  created_at timestamptz not null
);

create table if not exists public.stages (
  id text primary key,
  name text not null,
  order_index integer not null
);

create table if not exists public.leads (
  id text primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null,
  company text not null,
  owner text not null,
  source text not null,
  stage_id text not null references public.stages(id),
  temperature text not null,
  value integer not null,
  next_action text not null,
  status text not null,
  lost_reason text,
  last_reply_hours integer not null,
  summary_text text not null,
  objections_json jsonb not null,
  signals_json jsonb not null,
  next_best_action text not null,
  suggested_reply text not null
);

create table if not exists public.tasks (
  id bigint generated always as identity primary key,
  workspace_id text references public.workspaces(id) on delete cascade,
  lead_id text references public.leads(id) on delete cascade,
  due_time text not null,
  title text not null,
  priority text not null,
  completed boolean not null default false
);

create table if not exists public.team_members (
  id bigint generated always as identity primary key,
  workspace_id text not null references public.workspaces(id) on delete cascade,
  name text not null,
  role text not null
);

create table if not exists public.onboarding_steps (
  id bigint generated always as identity primary key,
  workspace_id text references public.workspaces(id) on delete cascade,
  title text not null,
  done boolean not null default false
);

create table if not exists public.notes (
  id bigint generated always as identity primary key,
  lead_id text not null references public.leads(id) on delete cascade,
  author text not null,
  body text not null,
  created_at timestamptz not null
);

create table if not exists public.events (
  id bigint generated always as identity primary key,
  lead_id text not null references public.leads(id) on delete cascade,
  event_type text not null,
  payload_json jsonb not null,
  created_at timestamptz not null
);
