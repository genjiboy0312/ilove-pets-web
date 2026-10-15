begin;

alter table public.pets add column version integer not null default 1 check(version > 0);
alter table public.media_assets drop constraint media_assets_status_check;
alter table public.media_assets add constraint media_assets_status_check check(status in ('reserved','processing','ready','rejected','deleting','deleted'));
alter table public.media_assets drop constraint media_assets_reserved_bytes_check;
alter table public.media_assets add constraint media_assets_reserved_bytes_check check(reserved_bytes between 0 and 10485760);
alter table public.media_assets add column display_key text;
alter table public.media_assets add column width integer check(width between 1 and 4096);
alter table public.media_assets add column height integer check(height between 1 and 4096);
alter table public.media_assets add constraint display_key_scope check(display_key is null or display_key = owner_id::text || '/' || id::text || '/display.webp');
alter table public.media_assets add constraint ready_has_image check(status <> 'ready' or (display_key is not null and width is not null and height is not null));
create unique index one_live_post_per_asset on public.posts(asset_id) where deleted_at is null;
create unique index cleanup_object_unique on public.cleanup_jobs(object_key);

create function public.cloud_version() returns integer language plpgsql security definer set search_path='' as $$
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  return 2;
end; $$;
revoke all on function public.cloud_version() from public,anon;
grant execute on function public.cloud_version() to authenticated;

create or replace function public.reserve_media(p_bytes bigint, p_mime_type text, p_purpose text)
returns public.media_assets language plpgsql security definer set search_path = '' as $$
declare actor uuid := auth.uid(); asset uuid := gen_random_uuid(); result public.media_assets;
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  if p_bytes is null or p_bytes < 1 or p_bytes > 5242880 then raise exception 'validation' using errcode='22023'; end if;
  perform pg_catalog.pg_advisory_xact_lock(79591001);
  if (select count(*) from public.media_assets where owner_id=actor and status in ('reserved','processing') and expires_at>now()) >= 3
    then raise exception 'rate_limited' using errcode='54000'; end if;
  -- Original + encoded object can coexist until cleanup. Never trust claimed byte size for quota.
  if (select coalesce(sum(reserved_bytes),0) from public.media_assets where owner_id=actor)+10485760 > 52428800
    or (select coalesce(sum(reserved_bytes),0) from public.media_assets)+10485760 > 838860800
    then raise exception 'quota' using errcode='54000'; end if;
  insert into public.media_assets(id,owner_id,object_key,purpose,reserved_bytes,expected_bytes,mime_type)
    values(asset,actor,actor::text||'/'||asset::text||'/original',p_purpose,10485760,p_bytes,p_mime_type) returning * into result;
  return result;
end; $$;

create function public.save_pet(p_id uuid,p_name text,p_category text,p_breed text,p_expected_version integer default null)
returns public.pets language plpgsql security definer set search_path='' as $$
declare result public.pets;
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  if p_expected_version is null then
    insert into public.pets(id,owner_id,name,category,breed) values(p_id,auth.uid(),btrim(p_name),p_category,btrim(p_breed)) on conflict(id) do nothing;
    select * into result from public.pets where id=p_id and owner_id=auth.uid();
    if result.id is null or result.name<>btrim(p_name) or result.category<>p_category or result.breed<>btrim(p_breed)
      then raise exception 'conflict' using errcode='40001'; end if;
  else
    update public.pets set name=btrim(p_name),category=p_category,breed=btrim(p_breed),version=version+1
      where id=p_id and owner_id=auth.uid() and version=p_expected_version returning * into result;
    if not found then raise exception 'conflict' using errcode='40001'; end if;
  end if;
  return result;
end; $$;
create function public.delete_pet(p_id uuid,p_expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  -- Keep tombstoned post references: erase them only after their media is physically cleaned.
  delete from public.posts p using public.media_assets a where p.pet_id=p_id and p.owner_id=auth.uid()
    and p.deleted_at is not null and p.asset_id=a.id and a.status='deleted';
  delete from public.pets where id=p_id and owner_id=auth.uid() and version=p_expected_version;
  if not found then raise exception 'conflict' using errcode='40001'; end if;
end; $$;

create function public.upsert_growth_record(p_id uuid,p_pet_id uuid,p_record_date date,p_weight_kg numeric,p_note text,p_expected_version integer default null)
returns public.growth_records language plpgsql security definer set search_path='' as $$
declare result public.growth_records; zone text;
begin
  if not app_private.active_owner() or not exists(select 1 from public.pets where id=p_pet_id and owner_id=auth.uid())
    then raise exception 'forbidden' using errcode='42501'; end if;
  select timezone into zone from public.profiles where id=auth.uid();
  if p_record_date is null or p_record_date>(now() at time zone zone)::date then raise exception 'validation' using errcode='22023'; end if;
  if p_expected_version is null then
    insert into public.growth_records(id,owner_id,pet_id,record_date,weight_kg,note)
      values(p_id,auth.uid(),p_pet_id,p_record_date,p_weight_kg,btrim(p_note)) on conflict(id) do nothing;
    select * into result from public.growth_records where id=p_id and owner_id=auth.uid();
    if result.id is null or result.pet_id<>p_pet_id or result.record_date<>p_record_date
      or result.weight_kg is distinct from p_weight_kg or result.note<>btrim(p_note)
      then raise exception 'conflict' using errcode='40001'; end if;
  else
    result:=public.save_growth_record(p_pet_id,p_record_date,p_weight_kg,p_note,p_id,p_expected_version);
  end if;
  return result;
end; $$;
create function public.delete_growth_record(p_id uuid,p_expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  delete from public.growth_records where id=p_id and owner_id=auth.uid() and version=p_expected_version;
  if not found then raise exception 'conflict' using errcode='40001'; end if;
end; $$;

create function public.save_private_post(p_id uuid,p_pet_id uuid,p_asset_id uuid,p_content text,p_expected_version integer default null)
returns public.posts language plpgsql security definer set search_path='' as $$
declare result public.posts;
begin
  if not app_private.active_owner() or not exists(select 1 from public.pets where id=p_pet_id and owner_id=auth.uid())
    then raise exception 'forbidden' using errcode='42501'; end if;
  -- Lock against concurrent deletion/reuse. Only decoded, private, owner-scoped images may be posted.
  perform 1 from public.media_assets where id=p_asset_id and owner_id=auth.uid() and status='ready' and purpose='post_photo' for update;
  if not found then raise exception 'invalid_media' using errcode='22023'; end if;
  if p_expected_version is null then
    insert into public.posts(id,owner_id,pet_id,asset_id,content,status,visibility)
      values(p_id,auth.uid(),p_pet_id,p_asset_id,btrim(p_content),'published','private') on conflict(id) do nothing;
    select * into result from public.posts where id=p_id and owner_id=auth.uid() and deleted_at is null;
    if result.id is null or result.pet_id<>p_pet_id or result.asset_id<>p_asset_id or result.content<>btrim(p_content)
      then raise exception 'conflict' using errcode='40001'; end if;
  else
    update public.posts set content=btrim(p_content),version=version+1 where id=p_id and owner_id=auth.uid()
      and pet_id=p_pet_id and asset_id=p_asset_id and deleted_at is null and version=p_expected_version returning * into result;
    if not found then raise exception 'conflict' using errcode='40001'; end if;
  end if;
  return result;
end; $$;
create function app_private.queue_media_cleanup(p_asset public.media_assets) returns void
language plpgsql security definer set search_path='' as $$
begin
  insert into public.cleanup_jobs(owner_id,object_key) values(p_asset.owner_id,p_asset.object_key),
    (p_asset.owner_id,p_asset.owner_id::text||'/'||p_asset.id::text||'/display.webp') on conflict(object_key) do nothing;
end; $$;
create function public.delete_private_post(p_id uuid,p_expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare asset public.media_assets; post public.posts;
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  select * into post from public.posts where id=p_id and owner_id=auth.uid() for update;
  if post.id is null then raise exception 'conflict' using errcode='40001'; end if;
  if post.deleted_at is not null then return; end if;
  if post.version<>p_expected_version then raise exception 'conflict' using errcode='40001'; end if;
  update public.posts set deleted_at=now(),status='deleted',version=version+1 where id=p_id;
  update public.media_assets set status='deleting' where id=post.asset_id returning * into asset;
  perform app_private.queue_media_cleanup(asset);
end; $$;
create function public.discard_media(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare asset public.media_assets;
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  select * into asset from public.media_assets where id=p_id and owner_id=auth.uid() for update;
  if asset.id is null then raise exception 'forbidden' using errcode='42501'; end if;
  -- A crashed worker needs operator reconciliation; never race a possibly live encoder.
  if asset.status='processing' then raise exception 'busy' using errcode='55000'; end if;
  if exists(select 1 from public.posts where asset_id=p_id and deleted_at is null) then raise exception 'in_use' using errcode='23503'; end if;
  update public.media_assets set status='deleting' where id=p_id;
  perform app_private.queue_media_cleanup(asset);
end; $$;

-- These transitions can only be performed by a trusted Edge Function.
create function public.claim_media(p_id uuid,p_owner uuid) returns public.media_assets
language plpgsql security definer set search_path='' as $$
declare asset public.media_assets;
begin
  select * into asset from public.media_assets where id=p_id and owner_id=p_owner for update;
  if asset.id is null or not exists(select 1 from public.profiles p join auth.users u on u.id=p.id
    where p.id=p_owner and p.account_state='active' and u.email_confirmed_at is not null) then raise exception 'forbidden' using errcode='42501'; end if;
  if asset.status='ready' then return asset; end if;
  -- Processing leases must be discarded after expiry, never reclaimed by a second worker.
  if asset.status<>'reserved' or asset.expires_at<=now() then raise exception 'busy_or_expired' using errcode='55000'; end if;
  update public.media_assets set status='processing',expires_at=now()+interval '2 minutes' where id=p_id returning * into asset;
  return asset;
end; $$;
create function public.finish_media(p_id uuid,p_owner uuid,p_bytes bigint,p_width integer,p_height integer) returns void
language plpgsql security definer set search_path='' as $$
begin
  if p_bytes<1 or p_bytes>5242880 or p_width*p_height>8000000 then raise exception 'validation' using errcode='22023'; end if;
  update public.media_assets set status='ready',display_key=owner_id::text||'/'||id::text||'/display.webp',
    actual_bytes=p_bytes,reserved_bytes=expected_bytes+p_bytes,width=p_width,height=p_height where id=p_id and owner_id=p_owner and status='processing' and expires_at>now();
  if not found then raise exception 'conflict' using errcode='40001'; end if;
end; $$;
create function public.fail_media(p_id uuid,p_owner uuid) returns void
language plpgsql security definer set search_path='' as $$
declare asset public.media_assets;
begin
  update public.media_assets set status='deleting' where id=p_id and owner_id=p_owner and status='processing' returning * into asset;
  if found then perform app_private.queue_media_cleanup(asset); end if;
end; $$;
create function public.reconcile_media_cleanup(p_owner uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  update public.media_assets a set status='deleted',reserved_bytes=0,actual_bytes=null where a.owner_id=p_owner and a.status='deleting'
    and exists(select 1 from public.cleanup_jobs j where j.owner_id=p_owner and j.object_key=a.object_key)
    and not exists(select 1 from public.cleanup_jobs j where j.owner_id=p_owner
      and j.object_key in (a.object_key,p_owner::text||'/'||a.id::text||'/display.webp') and j.status<>'done');
end; $$;
create or replace function app_private.can_read_media(object_name text) returns boolean
language sql stable security definer set search_path='' as $$
  select app_private.active_owner() and exists(select 1 from public.media_assets where owner_id=auth.uid()
    and ((status='reserved' and object_key=object_name) or (status='ready' and display_key=object_name)));
$$;
-- Cleanup retains the existing charge until both objects are confirmed deleted.
revoke all on function app_private.queue_media_cleanup(public.media_assets) from public,anon,authenticated;
revoke all on function public.save_pet(uuid,text,text,text,integer),public.delete_pet(uuid,integer),
 public.upsert_growth_record(uuid,uuid,date,numeric,text,integer),public.delete_growth_record(uuid,integer),
 public.save_private_post(uuid,uuid,uuid,text,integer),public.delete_private_post(uuid,integer),public.discard_media(uuid)
 from public,anon;
grant execute on function public.save_pet(uuid,text,text,text,integer),public.delete_pet(uuid,integer),
 public.upsert_growth_record(uuid,uuid,date,numeric,text,integer),public.delete_growth_record(uuid,integer),
 public.save_private_post(uuid,uuid,uuid,text,integer),public.delete_private_post(uuid,integer),public.discard_media(uuid)
 to authenticated;
revoke all on function public.claim_media(uuid,uuid),public.finish_media(uuid,uuid,bigint,integer,integer),
 public.fail_media(uuid,uuid),public.reconcile_media_cleanup(uuid) from public,anon,authenticated;
grant execute on function public.claim_media(uuid,uuid),public.finish_media(uuid,uuid,bigint,integer,integer),
 public.fail_media(uuid,uuid),public.reconcile_media_cleanup(uuid) to service_role;
commit;
