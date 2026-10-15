begin;
-- Immutable, owner-scoped receipts survive retries and target deletion. Local reactions are
-- archived here as private source data, never inserted into social comments/likes.
create table public.local_import_items (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check(kind in ('pet','post','growth')),
  source_id text not null check(char_length(source_id) between 1 and 200),
  payload jsonb not null check(jsonb_typeof(payload)='object' and octet_length(payload::text)<=32768),
  photo_hash text check(photo_hash ~ '^[a-f0-9]{64}$'),
  target_id uuid not null default gen_random_uuid(),
  pet_id uuid, mapped boolean not null default false,
  asset_id uuid, completed_at timestamptz,
  unique(owner_id,kind,source_id),
  foreign key(asset_id,owner_id) references public.media_assets(id,owner_id)
);
alter table public.local_import_items enable row level security;
create unique index local_import_asset_unique on public.local_import_items(asset_id) where asset_id is not null;
revoke all on public.local_import_items from public,anon,authenticated;
grant all on public.local_import_items to service_role;

create function public.prepare_local_import(p_kind text,p_source text,p_payload jsonb,p_photo_hash text default null,p_pet uuid default null)
returns public.local_import_items language plpgsql security definer set search_path='' as $$
declare item public.local_import_items;
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,734));
  select * into item from public.local_import_items where owner_id=auth.uid() and kind=p_kind and source_id=p_source for update;
  if found then
    if item.payload is distinct from p_payload or item.photo_hash is distinct from p_photo_hash
      or (p_kind<>'pet' and item.pet_id is distinct from p_pet)
      or (p_kind='pet' and p_pet is not null and item.target_id<>p_pet)
      then raise exception 'source_changed' using errcode='PT409'; end if;
    return item;
  end if;
  if (select count(*) from public.local_import_items where owner_id=auth.uid())>=5000 then raise exception 'quota' using errcode='54000'; end if;
  if (p_kind<>'pet' or p_pet is not null) and not exists(select 1 from public.pets where id=p_pet and owner_id=auth.uid()) then raise exception 'forbidden' using errcode='42501'; end if;
  if (p_kind='post' and p_photo_hash is null) or (p_kind='growth' and p_photo_hash is not null) then raise exception 'validation' using errcode='22023'; end if;
  insert into public.local_import_items(owner_id,kind,source_id,payload,photo_hash,pet_id,target_id,mapped)
    values(auth.uid(),p_kind,p_source,p_payload,p_photo_hash,p_pet,case when p_kind='pet' and p_pet is not null then p_pet else gen_random_uuid() end,p_kind='pet' and p_pet is not null) returning * into item;
  return item;
end; $$;
create function public.attach_local_import_media(p_id uuid,p_asset uuid) returns void
language plpgsql security definer set search_path='' as $$
declare item public.local_import_items;
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  select * into item from public.local_import_items where id=p_id and owner_id=auth.uid() for update;
  if item.id is null or item.photo_hash is null or item.completed_at is not null then raise exception 'validation' using errcode='22023'; end if;
  perform 1 from public.media_assets where id=p_asset and owner_id=auth.uid() and status='ready'
    and purpose=case when item.kind='pet' then 'pet_avatar' else 'post_photo' end for update;
  if not found or exists(select 1 from public.posts where asset_id=p_asset) or exists(select 1 from public.stories where asset_id=p_asset)
    or exists(select 1 from public.local_import_items where asset_id=p_asset and id<>p_id)
    then raise exception 'invalid_media' using errcode='22023'; end if;
  if item.asset_id is not null and item.asset_id<>p_asset and exists(select 1 from public.media_assets where id=item.asset_id and status='ready') then raise exception 'conflict' using errcode='PT409'; end if;
  update public.local_import_items set asset_id=p_asset where id=p_id;
end; $$;
create function public.finish_local_import(p_id uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare item public.local_import_items; p jsonb;
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  select * into item from public.local_import_items where id=p_id and owner_id=auth.uid() for update;
  if item.id is null then raise exception 'forbidden' using errcode='42501'; end if;
  if item.completed_at is not null then return item.target_id; end if;
  if item.photo_hash is not null then
    perform 1 from public.media_assets where id=item.asset_id and owner_id=auth.uid() and status='ready' for update;
    if not found then raise exception 'invalid_media' using errcode='22023'; end if;
  end if;
  p:=item.payload;
  if item.kind='pet' then
    if not item.mapped then
      perform public.save_pet(item.target_id,p->>'name',p->>'category',p->>'breed');
    elsif not exists(select 1 from public.pets where id=item.target_id and owner_id=auth.uid()) then raise exception 'missing_pet' using errcode='PT409'; end if;
  elsif item.kind='growth' then
    perform public.upsert_growth_record(item.target_id,item.pet_id,(p->>'date')::date,(p->>'weightKg')::numeric,coalesce(p->>'note',''));
  else
    perform public.save_private_post(item.target_id,item.pet_id,item.asset_id,p->>'content');
    update public.posts set source_created_at=(p->>'createdAt')::timestamptz,
      tags=coalesce(array(select jsonb_array_elements_text(p->'tags')),'{}'::text[])
      where id=item.target_id and owner_id=auth.uid();
  end if;
  update public.local_import_items set completed_at=now() where id=p_id;
  return item.target_id;
end; $$;
create function public.local_import_history(p_before uuid default null,p_pending boolean default false)
returns setof public.local_import_items language sql stable security definer set search_path='' as $$
  select * from public.local_import_items where owner_id=auth.uid() and app_private.active_owner()
    and (p_pending or completed_at is not null) and (p_before is null or id>p_before)
    order by id limit 100;
$$;
create or replace function public.own_story_assets() returns uuid[]
language sql stable security definer set search_path='' as $$
 select coalesce(array_agg(asset_id),'{}'::uuid[]) from (
  select asset_id from public.stories where owner_id=auth.uid() and deleted_at is null and app_private.active_owner()
  union select avatar_asset_id from public.profiles where id=auth.uid() and avatar_asset_id is not null and app_private.active_owner()
  union select asset_id from public.local_import_items where owner_id=auth.uid() and kind='pet' and completed_at is not null and asset_id is not null and app_private.active_owner()
 ) used;
$$;
create or replace function app_private.protect_story_asset() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_TABLE_NAME='media_assets' then
  if new.status='deleting' and old.status<>'deleting' and (
   exists(select 1 from public.stories where asset_id=old.id and deleted_at is null)
   or exists(select 1 from public.profiles where avatar_asset_id=old.id)
   or exists(select 1 from public.local_import_items where asset_id=old.id and kind='pet' and completed_at is not null)) then raise exception 'in_use' using errcode='23503'; end if;
 else
  if exists(select 1 from public.stories where asset_id=new.asset_id) then raise exception 'in_use' using errcode='23503'; end if;
 end if;
 return new;
end; $$;
revoke all on function public.prepare_local_import(text,text,jsonb,text,uuid),public.attach_local_import_media(uuid,uuid),public.finish_local_import(uuid),public.local_import_history(uuid,boolean) from public,anon;
grant execute on function public.prepare_local_import(text,text,jsonb,text,uuid),public.attach_local_import_media(uuid,uuid),public.finish_local_import(uuid),public.local_import_history(uuid,boolean) to authenticated;
notify pgrst,'reload schema';
commit;
