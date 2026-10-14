-- =====================================================================
-- Club Reclamation Platform — schema, triggers, functions and RLS (v2)
-- Safe to run on a fresh project AND to re-run on an existing one (upgrade).
-- Run in Supabase Dashboard > SQL Editor.
-- Roles: member | executive_member | dean   (dean is assigned manually, see make_dean)
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
  ('pap',               'PAP',               '#EC4899'),
  ('dean',              'Dean',              '#6366F1')
on conflict (department) do update set label = excluded.label, color_code = excluded.color_code;

-- ---------- 2. Tables ----------
create table if not exists public.profiles (
  id         uuid primary key references auth.users (id) on delete cascade,
  username   text not null check (username ~ '^[A-Za-z0-9_.-]{3,30}$'),
  role       text not null default 'member',
  department text not null references public.department_colors (department),
  created_at timestamptz not null default now()
);
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles drop constraint if exists profiles_role_department_check;
alter table public.profiles add constraint profiles_role_check
  check (role in ('member', 'executive_member', 'dean'));
alter table public.profiles add constraint profiles_role_department_check check (
     (role = 'member' and department in ('event', 'communication', 'hr'))
  or (role = 'executive_member' and department in
        ('event', 'communication', 'hr', 'partnership', 'general_secretary', 'president', 'vice_president', 'pap'))
  or (role = 'dean' and department = 'dean')
);
create unique index if not exists profiles_username_lower_key on public.profiles (lower(username));

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
  responder_username text not null,
  responder_title    text not null default 'HR',
  content            text not null check (char_length(btrim(content)) between 1 and 5000),
  created_at         timestamptz not null default now()
);
alter table public.complaint_replies add column if not exists responder_title text not null default 'HR';
create index if not exists replies_complaint_idx on public.complaint_replies (complaint_id, created_at);
create index if not exists replies_responder_idx on public.complaint_replies (responder_id);

create table if not exists public.ideas (
  id              uuid primary key default gen_random_uuid(),
  sender_id       uuid not null references public.profiles (id) on delete cascade,
  sender_username text not null,
  content         text not null check (char_length(btrim(content)) between 1 and 5000),
  department      text not null references public.department_colors (department),
  sender_role     text not null check (sender_role in ('member', 'executive_member')),
  color_code      text not null check (color_code ~ '^#[0-9A-Fa-f]{6}$'),
  created_at      timestamptz not null default now()
);
create index if not exists ideas_sender_idx  on public.ideas (sender_id, created_at desc);
create index if not exists ideas_created_idx on public.ideas (created_at desc);

create table if not exists public.idea_replies (
  id                 uuid primary key default gen_random_uuid(),
  idea_id            uuid not null references public.ideas (id) on delete cascade,
  responder_id       uuid not null references public.profiles (id) on delete restrict,
  responder_username text not null,
  responder_title    text not null default 'President',
  content            text not null check (char_length(btrim(content)) between 1 and 5000),
  created_at         timestamptz not null default now()
);
create index if not exists idea_replies_idea_idx      on public.idea_replies (idea_id, created_at);
create index if not exists idea_replies_responder_idx on public.idea_replies (responder_id);

-- ---------- 3. Authorization helpers (SECURITY DEFINER, fixed search_path) ----------
create or replace function public.my_role()
returns text language sql stable security definer set search_path = '' as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_executive()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'executive_member');
$$;

create or replace function public.is_hr_executive()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'executive_member' and department = 'hr');
$$;

create or replace function public.is_president()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid() and role = 'executive_member' and department = 'president');
$$;

-- Dean and President may read every idea.
create or replace function public.can_view_all_ideas()
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles
                 where id = auth.uid()
                   and (role = 'dean' or (role = 'executive_member' and department = 'president')));
$$;

-- Who may answer a complaint:
--   * HR executives answer complaints written by regular members
--   * the Dean answers complaints written by executive members
create or replace function public.can_reply_complaint(p_complaint_id uuid)
returns boolean language sql stable security definer set search_path = '' as $$
  select exists (
    select 1
    from public.complaints c
    join public.profiles p on p.id = auth.uid()
    where c.id = p_complaint_id
      and (   (p.role = 'executive_member' and p.department = 'hr' and c.sender_role = 'member')
           or (p.role = 'dean'             and c.sender_role = 'executive_member'))
  );
$$;

revoke all on function public.my_role(), public.is_executive(), public.is_hr_executive(),
  public.is_president(), public.can_view_all_ideas(), public.can_reply_complaint(uuid) from public, anon;
grant execute on function public.my_role(), public.is_executive(), public.is_hr_executive(),
  public.is_president(), public.can_view_all_ideas(), public.can_reply_complaint(uuid) to authenticated;

-- ---------- 4. Sign-up trigger (never trusts the browser for the role) ----------
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = '' as $$
declare
  v_username   text := btrim(coalesce(new.raw_user_meta_data ->> 'username', ''));
  v_dept       text := lower(coalesce(new.raw_user_meta_data ->> 'department', ''));
  v_wants_exec boolean := coalesce(new.raw_user_meta_data ->> 'requested_role', '') = 'executive_member';
  v_member_dept text;
begin
  if v_dept not in ('event', 'communication', 'hr', 'partnership', 'general_secretary',
                    'president', 'vice_president', 'pap') then
    raise exception 'Invalid department';
  end if;
  if not v_wants_exec and v_dept not in ('event', 'communication', 'hr') then
    raise exception 'Invalid department for a member';
  end if;

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

-- ---------- 5. Trusted privilege workflow (admin only, SQL Editor / service role) ----------
-- select public.approve_executive_request('<user-uuid>');   -- grants executive + the requested position
-- select public.reject_executive_request('<user-uuid>');
-- select public.make_dean('<user-uuid>');                   -- the only way to create the dean
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

create or replace function public.make_dean(p_user_id uuid)
returns void language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles set role = 'dean', department = 'dean' where id = p_user_id;
  if not found then raise exception 'Profile not found'; end if;
end;
$$;
revoke all on function public.approve_executive_request(uuid), public.reject_executive_request(uuid),
  public.make_dean(uuid) from public, anon, authenticated;

-- Guard on profiles:
--  * API users (auth.uid() not null) can never change role / department / id.
--  * Trusted changes (SQL Editor, service role) are kept consistent: promoting someone to
--    executive_member from the Table Editor automatically applies the position they requested
--    at sign-up (fixes "executive stays in Event"); role 'dean' always gets department 'dean'.
create or replace function public.profiles_guard()
returns trigger language plpgsql security definer set search_path = '' as $$
declare v_req text;
begin
  if auth.uid() is not null then
    if new.role <> old.role or new.department <> old.department or new.id <> old.id then
      raise exception 'role and department can only be changed by an administrator';
    end if;
    return new;
  end if;

  if new.role = 'executive_member' and old.role <> 'executive_member' and new.department = old.department then
    select requested_department into v_req from public.executive_requests
    where user_id = new.id and status in ('pending', 'approved');
    if v_req is not null then
      new.department := v_req;
      update public.executive_requests set status = 'approved', reviewed_at = now()
      where user_id = new.id and status = 'pending';
    end if;
  end if;
  if new.role = 'dean' then new.department := 'dean'; end if;
  return new;
end;
$$;
drop trigger if exists profiles_guard_trg on public.profiles;
create trigger profiles_guard_trg before update on public.profiles
  for each row execute function public.profiles_guard();

-- ---------- 6. Forgery-proof snapshot triggers ----------
drop trigger if exists complaints_set_sender on public.complaints;
drop trigger if exists ideas_set_sender      on public.ideas;

create or replace function public.set_sender_snapshot()
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
revoke all on function public.set_sender_snapshot() from public, anon, authenticated;
drop function if exists public.set_complaint_sender();

create trigger complaints_set_sender before insert on public.complaints
  for each row execute function public.set_sender_snapshot();
create trigger ideas_set_sender before insert on public.ideas
  for each row execute function public.set_sender_snapshot();

create or replace function public.set_reply_responder()
returns trigger language plpgsql security definer set search_path = '' as $$
declare p public.profiles%rowtype;
begin
  select * into p from public.profiles where id = auth.uid();
  if not found then raise exception 'Authenticated profile required'; end if;
  new.id                 := gen_random_uuid();
  new.responder_id       := p.id;
  new.responder_username := p.username;
  new.responder_title    := case
    when p.role = 'dean' then 'Dean'
    when p.role = 'executive_member' and p.department = 'president' then 'President'
    when p.role = 'executive_member' and p.department = 'hr' then 'HR'
    else 'Executive' end;
  new.created_at         := now();
  return new;
end;
$$;
revoke all on function public.set_reply_responder() from public, anon, authenticated;

drop trigger if exists replies_set_responder      on public.complaint_replies;
drop trigger if exists idea_replies_set_responder on public.idea_replies;
create trigger replies_set_responder before insert on public.complaint_replies
  for each row execute function public.set_reply_responder();
create trigger idea_replies_set_responder before insert on public.idea_replies
  for each row execute function public.set_reply_responder();

-- ---------- 7. Privileges (least privilege) ----------
revoke all on public.profiles, public.executive_requests, public.complaints, public.complaint_replies,
              public.ideas, public.idea_replies, public.department_colors from anon, authenticated;
grant select on public.profiles, public.executive_requests, public.department_colors to authenticated;
grant select, insert (content) on public.complaints to authenticated;
grant select, insert (complaint_id, content) on public.complaint_replies to authenticated;
grant select, insert (content) on public.ideas to authenticated;
grant select, insert (idea_id, content) on public.idea_replies to authenticated;
-- No UPDATE / DELETE is granted on any table to API roles.

-- ---------- 8. Row Level Security ----------
alter table public.department_colors  enable row level security;
alter table public.profiles           enable row level security;
alter table public.executive_requests enable row level security;
alter table public.complaints         enable row level security;
alter table public.complaint_replies  enable row level security;
alter table public.ideas              enable row level security;
alter table public.idea_replies       enable row level security;

drop policy if exists "colors readable"                    on public.department_colors;
drop policy if exists "profiles: read own"                 on public.profiles;
drop policy if exists "exec requests: read own"            on public.executive_requests;
drop policy if exists "complaints: insert own"             on public.complaints;
drop policy if exists "complaints: read"                   on public.complaints;
drop policy if exists "replies: read"                      on public.complaint_replies;
drop policy if exists "replies: HR executives insert"      on public.complaint_replies;
drop policy if exists "replies: authorized responders insert" on public.complaint_replies;
drop policy if exists "ideas: insert own"                  on public.ideas;
drop policy if exists "ideas: read"                        on public.ideas;
drop policy if exists "idea replies: read"                 on public.idea_replies;
drop policy if exists "idea replies: president insert"     on public.idea_replies;

create policy "colors readable" on public.department_colors for select to authenticated using (true);
create policy "profiles: read own" on public.profiles for select to authenticated using (id = auth.uid());
create policy "exec requests: read own" on public.executive_requests for select to authenticated using (user_id = auth.uid());

-- Complaints: own; executives also read members' complaints; the dean reads executives' complaints.
create policy "complaints: insert own" on public.complaints for insert to authenticated
  with check (sender_id = auth.uid() and public.my_role() in ('member', 'executive_member'));
create policy "complaints: read" on public.complaints for select to authenticated
  using (
       sender_id = auth.uid()
    or (public.my_role() = 'executive_member' and sender_role = 'member')
    or (public.my_role() = 'dean'             and sender_role = 'executive_member')
  );

-- Replies are readable by whoever can read the parent complaint (its RLS applies in the sub-select).
create policy "replies: read" on public.complaint_replies for select to authenticated
  using (exists (select 1 from public.complaints c where c.id = complaint_id));
create policy "replies: authorized responders insert" on public.complaint_replies for insert to authenticated
  with check (responder_id = auth.uid() and public.can_reply_complaint(complaint_id));

-- Ideas: own; the dean and the president read all; only the president replies.
create policy "ideas: insert own" on public.ideas for insert to authenticated
  with check (sender_id = auth.uid() and public.my_role() in ('member', 'executive_member'));
create policy "ideas: read" on public.ideas for select to authenticated
  using (sender_id = auth.uid() or public.can_view_all_ideas());

create policy "idea replies: read" on public.idea_replies for select to authenticated
  using (exists (select 1 from public.ideas i where i.id = idea_id));
create policy "idea replies: president insert" on public.idea_replies for insert to authenticated
  with check (responder_id = auth.uid() and public.is_president());
