create or replace function public.current_user_email()
returns text
language sql
stable
as $$
  select nullif(auth.jwt() ->> 'email', '');
$$;

create or replace function public.current_app_user_id()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select users.id
  from public.users
  where lower(users.email) = lower(public.current_user_email())
  limit 1;
$$;

create or replace function public.lead_workspace_id(target_lead_id text)
returns text
language sql
stable
security definer
set search_path = public
as $$
  select leads.workspace_id
  from public.leads
  where leads.id = target_lead_id
  limit 1;
$$;

create or replace function public.has_workspace_access(target_workspace_id text, allowed_statuses text[] default array['active'])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships
    where workspace_id = target_workspace_id
      and user_id = public.current_app_user_id()
      and status = any(allowed_statuses)
  );
$$;

create or replace function public.has_workspace_role(target_workspace_id text, allowed_roles text[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.workspace_memberships
    where workspace_id = target_workspace_id
      and user_id = public.current_app_user_id()
      and status = 'active'
      and role = any(allowed_roles)
  );
$$;

alter table public.workspaces enable row level security;
alter table public.users enable row level security;
alter table public.workspace_memberships enable row level security;
alter table public.stages enable row level security;
alter table public.leads enable row level security;
alter table public.tasks enable row level security;
alter table public.team_members enable row level security;
alter table public.onboarding_steps enable row level security;
alter table public.notes enable row level security;
alter table public.events enable row level security;
alter table public.sessions enable row level security;

drop policy if exists "workspaces_select_member_or_invited" on public.workspaces;
create policy "workspaces_select_member_or_invited"
on public.workspaces
for select
using (public.has_workspace_access(id, array['active', 'invited']));

drop policy if exists "users_select_self_or_same_workspace" on public.users;
create policy "users_select_self_or_same_workspace"
on public.users
for select
using (
  id = public.current_app_user_id()
  or exists (
    select 1
    from public.workspace_memberships own_membership
    join public.workspace_memberships target_membership
      on target_membership.workspace_id = own_membership.workspace_id
    where own_membership.user_id = public.current_app_user_id()
      and own_membership.status = 'active'
      and target_membership.user_id = users.id
      and target_membership.status in ('active', 'invited')
  )
);

drop policy if exists "memberships_select_same_workspace" on public.workspace_memberships;
create policy "memberships_select_same_workspace"
on public.workspace_memberships
for select
using (
  user_id = public.current_app_user_id()
  or public.has_workspace_access(workspace_id, array['active', 'invited'])
);

drop policy if exists "memberships_manage_by_admin_or_manager" on public.workspace_memberships;
create policy "memberships_manage_by_admin_or_manager"
on public.workspace_memberships
for all
using (public.has_workspace_role(workspace_id, array['admin', 'manager']))
with check (public.has_workspace_role(workspace_id, array['admin', 'manager']));

drop policy if exists "stages_select_all_authenticated" on public.stages;
create policy "stages_select_all_authenticated"
on public.stages
for select
using (auth.role() = 'authenticated');

drop policy if exists "leads_select_same_workspace" on public.leads;
create policy "leads_select_same_workspace"
on public.leads
for select
using (public.has_workspace_access(workspace_id, array['active']));

drop policy if exists "leads_insert_same_workspace" on public.leads;
create policy "leads_insert_same_workspace"
on public.leads
for insert
with check (public.has_workspace_access(workspace_id, array['active']));

drop policy if exists "leads_update_same_workspace" on public.leads;
create policy "leads_update_same_workspace"
on public.leads
for update
using (public.has_workspace_access(workspace_id, array['active']))
with check (public.has_workspace_access(workspace_id, array['active']));

drop policy if exists "tasks_select_same_workspace" on public.tasks;
create policy "tasks_select_same_workspace"
on public.tasks
for select
using (public.has_workspace_access(workspace_id, array['active']));

drop policy if exists "tasks_insert_same_workspace" on public.tasks;
create policy "tasks_insert_same_workspace"
on public.tasks
for insert
with check (public.has_workspace_access(workspace_id, array['active']));

drop policy if exists "tasks_update_same_workspace" on public.tasks;
create policy "tasks_update_same_workspace"
on public.tasks
for update
using (public.has_workspace_access(workspace_id, array['active']))
with check (public.has_workspace_access(workspace_id, array['active']));

drop policy if exists "team_select_same_workspace" on public.team_members;
create policy "team_select_same_workspace"
on public.team_members
for select
using (public.has_workspace_access(workspace_id, array['active']));

drop policy if exists "team_manage_admin_or_manager" on public.team_members;
create policy "team_manage_admin_or_manager"
on public.team_members
for all
using (public.has_workspace_role(workspace_id, array['admin', 'manager']))
with check (public.has_workspace_role(workspace_id, array['admin', 'manager']));

drop policy if exists "onboarding_select_same_workspace" on public.onboarding_steps;
create policy "onboarding_select_same_workspace"
on public.onboarding_steps
for select
using (public.has_workspace_access(workspace_id, array['active']));

drop policy if exists "notes_select_same_workspace" on public.notes;
create policy "notes_select_same_workspace"
on public.notes
for select
using (public.has_workspace_access(public.lead_workspace_id(lead_id), array['active']));

drop policy if exists "notes_insert_same_workspace" on public.notes;
create policy "notes_insert_same_workspace"
on public.notes
for insert
with check (public.has_workspace_access(public.lead_workspace_id(lead_id), array['active']));

drop policy if exists "events_select_same_workspace" on public.events;
create policy "events_select_same_workspace"
on public.events
for select
using (public.has_workspace_access(public.lead_workspace_id(lead_id), array['active']));

drop policy if exists "events_insert_same_workspace" on public.events;
create policy "events_insert_same_workspace"
on public.events
for insert
with check (public.has_workspace_access(public.lead_workspace_id(lead_id), array['active']));
