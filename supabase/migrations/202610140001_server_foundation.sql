begin;

create schema if not exists app_private;
revoke all on schema app_private from public;
grant usage on schema app_private to authenticated, anon, service_role;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  username text not null unique check (username ~ '^[a-z0-9_]{3,30}$'),
  display_name text not null default 'Pet lover' check (char_length(display_name) between 1 and 100),
  bio text not null default '' check (char_length(bio) <= 500),
  timezone text not null default 'Asia/Seoul',
  account_state text not null default 'active' check (account_state in ('active', 'deleting')),
  created_at timestamptz not null default now()
);
create table public.pets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  name text not null check (char_length(btrim(name)) between 1 and 100),
  category text not null check (category in ('DOG','CAT','REPTILE','BIRD','SMALL_ANIMAL','ETC')),
  breed text not null check (char_length(btrim(breed)) between 1 and 100),
  created_at timestamptz not null default now(),
  unique(id, owner_id)
);
create table public.media_assets (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  object_key text not null unique,
  purpose text not null check (purpose in ('post_photo','pet_avatar','profile_avatar')),
  status text not null default 'reserved' check (status in ('reserved','ready','rejected','deleting')),
  reserved_bytes bigint not null check (reserved_bytes between 1 and 5242880),
  expected_bytes bigint not null check (expected_bytes between 1 and 5242880),
  actual_bytes bigint check (actual_bytes between 1 and reserved_bytes),
  mime_type text not null check (mime_type in ('image/jpeg','image/png','image/webp')),
  expires_at timestamptz not null default now() + interval '15 minutes',
  created_at timestamptz not null default now(),
  unique(id, owner_id),
  check (object_key = owner_id::text || '/' || id::text || '/original')
);
create table public.posts (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null,
  asset_id uuid not null,
  content text not null check (char_length(btrim(content)) between 1 and 2000),
  tags text[] not null default '{}' check (cardinality(tags) <= 5),
  visibility text not null default 'private' check (visibility in ('private','public')),
  status text not null default 'draft' check (status in ('draft','published','deleted')),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  source_created_at timestamptz,
  deleted_at timestamptz,
  foreign key(pet_id, owner_id) references public.pets(id, owner_id),
  foreign key(asset_id, owner_id) references public.media_assets(id, owner_id)
);
create table public.growth_records (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  pet_id uuid not null,
  record_date date not null,
  weight_kg numeric check (weight_kg > 0 and weight_kg <= 1000),
  note text not null default '' check (char_length(note) <= 500),
  version integer not null default 1 check (version > 0),
  created_at timestamptz not null default now(),
  foreign key(pet_id, owner_id) references public.pets(id, owner_id),
  check (weight_kg is not null or char_length(btrim(note)) > 0)
);
-- Jobs survive account deletion so object cleanup cannot be lost through an Auth FK cascade.
create table public.cleanup_jobs (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null,
  object_key text not null,
  status text not null default 'pending' check (status in ('pending','running','done','failed')),
  attempts integer not null default 0,
  created_at timestamptz not null default now()
);

create index pets_owner_idx on public.pets(owner_id);
create index assets_owner_idx on public.media_assets(owner_id, status);
create index posts_owner_cursor_idx on public.posts(owner_id, created_at desc, id desc);
create index growth_owner_pet_idx on public.growth_records(owner_id, pet_id, record_date, id);

create function app_private.active_owner() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists(select 1 from public.profiles p join auth.users u on u.id = p.id
    where p.id = auth.uid() and p.account_state = 'active' and u.email_confirmed_at is not null);
$$;

create function public.ensure_profile() returns public.profiles
language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); result public.profiles;
begin
  if actor is null or not exists(select 1 from auth.users where id = actor and email_confirmed_at is not null)
    then raise exception 'unauthorized' using errcode = '42501'; end if;
  insert into public.profiles(id, username) values(actor, 'pet_' || right(replace(actor::text, '-', ''), 24))
    on conflict(id) do nothing;
  select * into result from public.profiles where id = actor;
  if result.account_state <> 'active' then raise exception 'forbidden' using errcode = '42501'; end if;
  return result;
end; $$;

create function public.update_profile(p_username text, p_display_name text, p_bio text, p_timezone text)
returns public.profiles language plpgsql security definer set search_path = '' as $$
declare result public.profiles;
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode = '42501'; end if;
  if not exists(select 1 from pg_catalog.pg_timezone_names where name = p_timezone)
    then raise exception 'validation' using errcode = '22023'; end if;
  update public.profiles set username = lower(btrim(p_username)), display_name = btrim(p_display_name),
    bio = p_bio, timezone = p_timezone where id = auth.uid() returning * into result;
  return result;
end; $$;

create function public.create_pet(p_name text, p_category text, p_breed text)
returns public.pets language plpgsql security definer set search_path = '' as $$
declare result public.pets;
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode = '42501'; end if;
  insert into public.pets(owner_id, name, category, breed) values(auth.uid(), btrim(p_name), p_category, btrim(p_breed)) returning * into result;
  return result;
end; $$;

create function public.save_growth_record(p_pet_id uuid, p_record_date date, p_weight_kg numeric, p_note text,
  p_id uuid default null, p_expected_version integer default null)
returns public.growth_records language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); zone text; result public.growth_records;
begin
  if not app_private.active_owner() or not exists(select 1 from public.pets where id = p_pet_id and owner_id = actor)
    then raise exception 'forbidden' using errcode = '42501'; end if;
  select timezone into zone from public.profiles where id = actor;
  if p_record_date is null or p_record_date > (now() at time zone zone)::date
    then raise exception 'validation' using errcode = '22023'; end if;
  if p_id is null then
    insert into public.growth_records(owner_id, pet_id, record_date, weight_kg, note)
      values(actor, p_pet_id, p_record_date, p_weight_kg, btrim(p_note)) returning * into result;
  else
    update public.growth_records set record_date = p_record_date, weight_kg = p_weight_kg, note = btrim(p_note), version = version + 1
      where id = p_id and owner_id = actor and pet_id = p_pet_id and version = p_expected_version returning * into result;
    if not found then raise exception 'conflict' using errcode = '40001'; end if;
  end if;
  return result;
end; $$;

create function public.reserve_media(p_bytes bigint, p_mime_type text, p_purpose text)
returns public.media_assets language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); asset uuid := gen_random_uuid(); result public.media_assets;
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode = '42501'; end if;
  if p_bytes is null or p_bytes < 1 or p_bytes > 5242880 then raise exception 'validation' using errcode = '22023'; end if;
  -- Serializes global/account reservations, including competing tabs. Expired bytes stay reserved until cleanup.
  perform pg_catalog.pg_advisory_xact_lock(79591001);
  if (select count(*) from public.media_assets where owner_id = actor and status = 'reserved' and expires_at > now()) >= 3
    then raise exception 'rate_limited' using errcode = '54000'; end if;
  -- Storage enforces the bucket's 5MiB cap, not a client's claimed p_bytes.
  -- Charge a full slot until a trusted finalizer validates and reconciles actual bytes.
  if (select coalesce(sum(reserved_bytes),0) from public.media_assets where owner_id = actor) + 5242880 > 52428800
    or (select coalesce(sum(reserved_bytes),0) from public.media_assets) + 5242880 > 838860800
    then raise exception 'quota' using errcode = '54000'; end if;
  insert into public.media_assets(id, owner_id, object_key, purpose, reserved_bytes, expected_bytes, mime_type)
    values(asset, actor, actor::text || '/' || asset::text || '/original', p_purpose, 5242880, p_bytes, p_mime_type) returning * into result;
  return result;
end; $$;

alter table public.profiles enable row level security;
alter table public.pets enable row level security;
alter table public.media_assets enable row level security;
alter table public.posts enable row level security;
alter table public.growth_records enable row level security;
alter table public.cleanup_jobs enable row level security;
create policy profiles_read on public.profiles for select to authenticated using(id = auth.uid());
create policy pets_read on public.pets for select to authenticated using(owner_id = auth.uid() and app_private.active_owner());
create policy assets_read on public.media_assets for select to authenticated using(owner_id = auth.uid() and app_private.active_owner());
create policy posts_read on public.posts for select to authenticated using(owner_id = auth.uid() and deleted_at is null and app_private.active_owner());
create policy growth_read on public.growth_records for select to authenticated using(owner_id = auth.uid() and app_private.active_owner());
revoke all on public.profiles, public.pets, public.media_assets, public.posts, public.growth_records, public.cleanup_jobs from anon, authenticated;
grant select on public.profiles, public.pets, public.media_assets, public.posts, public.growth_records to authenticated;
grant all on public.profiles, public.pets, public.media_assets, public.posts, public.growth_records, public.cleanup_jobs to service_role;
revoke all on function app_private.active_owner() from public;
grant execute on function app_private.active_owner() to authenticated, service_role;
revoke all on function public.ensure_profile(), public.update_profile(text,text,text,text), public.create_pet(text,text,text),
  public.save_growth_record(uuid,date,numeric,text,uuid,integer), public.reserve_media(bigint,text,text) from public, anon;
grant execute on function public.ensure_profile(), public.update_profile(text,text,text,text), public.create_pet(text,text,text),
  public.save_growth_record(uuid,date,numeric,text,uuid,integer), public.reserve_media(bigint,text,text) to authenticated;

insert into storage.buckets(id, name, public, file_size_limit, allowed_mime_types)
values('pet-media','pet-media',false,5242880,array['image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false, file_size_limit=excluded.file_size_limit, allowed_mime_types=excluded.allowed_mime_types;

create function app_private.can_upload_media(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.active_owner() and exists(select 1 from public.media_assets
    where owner_id = auth.uid() and object_key = object_name and status = 'reserved' and expires_at > now());
$$;
create function app_private.can_read_media(object_name text) returns boolean
language sql stable security definer set search_path = '' as $$
  select app_private.active_owner() and exists(select 1 from public.media_assets
    where owner_id = auth.uid() and object_key = object_name and status in ('reserved','ready'));
$$;
revoke all on function app_private.can_upload_media(text), app_private.can_read_media(text) from public;
grant execute on function app_private.can_upload_media(text), app_private.can_read_media(text) to authenticated, anon, service_role;
grant execute on function app_private.active_owner() to anon;
create policy pet_media_insert on storage.objects for insert to authenticated
  with check(bucket_id = 'pet-media' and app_private.can_upload_media(name));
create policy pet_media_read on storage.objects for select to authenticated
  using(bucket_id = 'pet-media' and app_private.can_read_media(name));
-- Restrictive boundaries still apply if another permissive storage policy is added later.
create policy pet_media_insert_guard on storage.objects as restrictive for insert to anon, authenticated
  with check(bucket_id <> 'pet-media' or app_private.can_upload_media(name));
create policy pet_media_read_guard on storage.objects as restrictive for select to anon, authenticated
  using(bucket_id <> 'pet-media' or app_private.can_read_media(name));
create policy pet_media_no_update on storage.objects as restrictive for update to anon, authenticated
  using(bucket_id <> 'pet-media') with check(bucket_id <> 'pet-media');
create policy pet_media_no_delete on storage.objects as restrictive for delete to anon, authenticated
  using(bucket_id <> 'pet-media');

commit;
