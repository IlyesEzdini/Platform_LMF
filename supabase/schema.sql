-- =====================================================================
-- Club Reclamation Platform — full schema, triggers, functions and RLS
-- Run once in Supabase Dashboard > SQL Editor (as the default postgres role).
-- =====================================================================

-- ---------- 1. Central department / color configuration ----------
create table if not exists public.department_colors (
  department text primary key,
  label      text not null,
  color_code text not null check (color_code ~ '^#[0-9A-Fa-f]{6}$')
);

insert into public.department_colors (department, label, color_code) values
  ('event',             'Event',             '#3B82F6'),
  ('communication',     'Communication',     '#8B5CF6'),
  ('hr',                'HR',                '#EF4444'),
  ('partnership',       'Partnership',       '#22C55E'),
  ('general_secretary', 'General Secretary', '#F97316'),
  ('president',         'President',         '#D4A017'),
  ('vice_president',    'Vice President',    '#14B8A6'),
  ('pap',               'PAP',               '#EC4899')
on conflict (department) do update set label = excluded.label, color_code = excluded.color_code;

-- ---------- 2. Tables ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null check (username ~ '^[A-Za-z0-9_.-]{3,30}$'),
  role       text not null default 'member' check (role in ('member', 'executive_member')),
  department text not null references public.department_colors (department),
  created_at timestamptz not null default now(),
  constraint profiles_role_department_check check (
    (role = 'member' and department in ('event', 'communication', 'hr'))
    or role = 'executive_member'
  )
);
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

-- Executive access is requested at sign-up but only granted by an administrator.
create table if not exists public.executive_requests (
  user_id              uuid primary key references public.profiles (id) on delete cascade,
  requested_department text not null references public.department_colors (department),
  status               text not null default 'pending' check (status in ('pending', 'approved', 'rejected')),
  created_at           timestamptz not null default now(),
  reviewed_at          timestamptz
);

create table if not exists public.complaints (
  id              uuid primary key default gen_random_uuid(),
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  sender_username text not null,
  content         text not null check (char_length(btrim(content)) between 1 and 5000),
  department      text not null references public.department_colors (department),
  sender_role     text not null check (sender_role in ('member', 'executive_member')),
  color_code      text not null check (color_code ~ '^#[0-9A-Fa-f]{6}$'),
  created_at      timestamptz not null default now()
);
create index if not exists complaints_sender_idx  on public.complaints (sender_id, created_at desc);
create index if not exists complaints_created_idx on public.complaints (created_at desc);

create table if not exists public.complaint_replies (
  id                 uuid primary key default gen_random_uuid(),
  complaint_id       uuid not null references public.complaints (id) on delete cascade,
  responder_id       uuid not null references public.profiles (id) on delete restrict,
  responder_username text not null,  -- snapshot so members can see who answered without reading other profiles
  content            text not null check (char_length(btrim(content)) between 1 and 5000),
  created_at         timestamptz not null default now()
);
create index if not exists replies_complaint_idx on public.complaint_replies (complaint_id, created_at);
create index if not exists replies_responder_idx on public.complaint_replies (responder_id);

-- ---------- 3. Authorization helpers (SECURITY DEFINER, fixed search_path) ----------
create or replace function public.is_executive()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'executive_member');
$$;

create or replace function public.is_hr_executive()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'executive_member' and department = 'hr'
  );
$$;

revoke all on function public.is_executive()    from public, anon;
revoke all on function public.is_hr_executive() from public, anon;
grant execute on function public.is_executive()    to authenticated;
grant execute on function public.is_hr_executive() to authenticated;

-- ---------- 4. Sign-up trigger: profile creation (never trusts the browser for the role) ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_username   text := btrim(coalesce(new.raw_user_meta_data ->> 'username', ''));
  v_dept       text := lower(coalesce(new.raw_user_meta_data ->> 'department', ''));
  v_wants_exec boolean := coalesce(new.raw_user_meta_data ->> 'requested_role', '') = 'executive_member';
  v_member_dept text;
begin
  if not exists (select 1 from public.department_colors where department = v_dept) then
    raise exception 'Invalid department';
  end if;
  if not v_wants_exec and v_dept not in ('event', 'communication', 'hr') then
    raise exception 'Invalid department for a member';
  end if;

  -- Everyone starts as a regular member, whatever the client sent.
  v_member_dept := case when v_dept in ('event', 'communication', 'hr') then v_dept else 'event' end;
  insert into public.profiles (id, username, role, department)
  values (new.id, v_username, 'member', v_member_dept);

  if v_wants_exec then
    insert into public.executive_requests (user_id, requested_department) values (new.id, v_dept);
  end if;
  return new;
end;
$$;
revoke all on function public.handle_new_user() from public, anon, authenticated;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users for each row execute function public.handle_new_user();

-- ---------- 5. Trusted executive approval workflow (admin only) ----------
-- Run from the SQL Editor:  select public.approve_executive_request('<user-uuid>');
create or replace function public.approve_executive_request(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
declare v_dept text;
begin
  select requested_department into v_dept
  from public.executive_requests where user_id = p_user_id and status = 'pending';
  if v_dept is null then raise exception 'No pending executive request for this user'; end if;
  update public.profiles set role = 'executive_member', department = v_dept where id = p_user_id;
  update public.executive_requests set status = 'approved', reviewed_at = now() where user_id = p_user_id;
end;
$$;

create or replace function public.reject_executive_request(p_user_id uuid)
returns void language sql security definer set search_path = '' as $$
  update public.executive_requests set status = 'rejected', reviewed_at = now()
  where user_id = p_user_id and status = 'pending';
$$;
revoke all on function public.approve_executive_request(uuid) from public, anon, authenticated;
revoke all on function public.reject_executive_request(uuid)  from public, anon, authenticated;

-- Defense in depth: even if a grant/policy were added by mistake, API users
-- (auth.uid() not null) can never change role or department.
create or replace function public.profiles_guard()
returns trigger language plpgsql set search_path = '' as $$
begin
  if auth.uid() is not null and (new.role <> old.role or new.department <> old.department or new.id <> old.id) then
    raise exception 'role and department can only be changed by an administrator';
  end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_trg on public.profiles;
create trigger profiles_guard_trg before update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------- 6. Forgery-proof complaint and reply triggers ----------
create or replace function public.set_complaint_sender()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p public.profiles%rowtype;
begin
  select * into p from public.profiles where id = auth.uid();
  if not found then raise exception 'Authenticated profile required'; end if;
  new.id              := gen_random_uuid();
  new.sender_id       := p.id;
  new.sender_username := p.username;
  new.sender_role     := p.role;
  new.department      := p.department;
  new.color_code      := (select color_code from public.department_colors where department = p.department);
  new.created_at      := now();
  return new;
end;
$$;
revoke all on function public.set_complaint_sender() from public, anon, authenticated;
drop trigger if exists complaints_set_sender on public.complaints;
create trigger complaints_set_sender before insert on public.complaints
  for each row execute function public.set_complaint_sender();

create or replace function public.set_reply_responder()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p public.profiles%rowtype;
begin
  select * into p from public.profiles where id = auth.uid();
  if not found then raise exception 'Authenticated profile required'; end if;
  new.id                 := gen_random_uuid();
  new.responder_id       := p.id;
  new.responder_username := p.username;
  new.created_at         := now();
  return new;
end;
$$;
revoke all on function public.set_reply_responder() from public, anon, authenticated;
drop trigger if exists replies_set_responder on public.complaint_replies;
create trigger replies_set_responder before insert on public.complaint_replies
  for each row execute function public.set_reply_responder();

-- ---------- 7. Privileges (least privilege) ----------
revoke all on public.profiles, public.executive_requests, public.complaints,
              public.complaint_replies, public.department_colors from anon, authenticated;
grant select on public.profiles, public.executive_requests, public.department_colors to authenticated;
grant select, insert (content) on public.complaints to authenticated;
grant select, insert (complaint_id, content) on public.complaint_replies to authenticated;
-- No UPDATE / DELETE is granted on any table to API roles.

-- ---------- 8. Row Level Security ----------
alter table public.department_colors  enable row level security;
alter table public.profiles           enable row level security;
alter table public.executive_requests enable row level security;
alter table public.complaints         enable row level security;
alter table public.complaint_replies  enable row level security;

drop policy if exists "colors readable"            on public.department_colors;
drop policy if exists "profiles: read own"         on public.profiles;
drop policy if exists "exec requests: read own"    on public.executive_requests;
drop policy if exists "complaints: insert own"     on public.complaints;
drop policy if exists "complaints: read"           on public.complaints;
drop policy if exists "replies: read"              on public.complaint_replies;
drop policy if exists "replies: HR executives insert" on public.complaint_replies;

create policy "colors readable" on public.department_colors for select to authenticated using (true);

-- No insert/update/delete policy on profiles: only the sign-up trigger and the admin function write to it.
create policy "profiles: read own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "exec requests: read own" on public.executive_requests for select to authenticated using (user_id = auth.uid());

create policy "complaints: insert own" on public.complaints for insert to authenticated
  with check (sender_id = auth.uid());
create policy "complaints: read" on public.complaints for select to authenticated
  using (sender_id = auth.uid() or public.is_executive());

create policy "replies: read" on public.complaint_replies for select to authenticated
  using (
    public.is_executive()
    or exists (select 1 from public.complaints c where c.id = complaint_id and c.sender_id = auth.uid())
  );
create policy "replies: HR executives insert" on public.complaint_replies for insert to authenticated
  with check (responder_id = auth.uid() and public.is_hr_executive());
