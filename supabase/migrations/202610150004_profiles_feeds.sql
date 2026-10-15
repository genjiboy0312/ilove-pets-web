begin;
alter table public.profiles add column avatar_asset_id uuid;
alter table public.profiles add column version integer not null default 1 check(version>0);
alter table public.profiles add column profile_published boolean not null default false;
alter table public.profiles add foreign key(avatar_asset_id,id) references public.media_assets(id,owner_id);

create function app_private.public_profile(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles u where u.id=p_id and u.account_state='active'
   and (u.profile_published or exists(select 1 from public.posts p where p.owner_id=u.id and app_private.public_post(p.id))));
$$;
revoke all on function app_private.public_profile(uuid) from public,anon,authenticated;

create function public.social_profile(p_username text default null)
returns table(id uuid,username text,display_name text,bio text,avatar_asset_id uuid,posts bigint,followers bigint,following_count bigint,following boolean,version integer)
language sql stable security definer set search_path='' as $$
 select u.id,u.username,u.display_name,u.bio,u.avatar_asset_id,
   (select count(*) from public.posts p where p.owner_id=u.id and app_private.public_post(p.id)),
   (select count(*) from public.follows f join public.profiles a on a.id=f.follower_id where f.following_id=u.id and a.account_state='active'),
   (select count(*) from public.follows f join public.profiles a on a.id=f.following_id where f.follower_id=u.id and a.account_state='active'),
   exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=u.id),
   case when u.id=auth.uid() then u.version else null::integer end
 from public.profiles u where u.account_state='active'
   and ((p_username is null and u.id=auth.uid()) or u.username=lower(btrim(p_username)))
   and ((u.id=auth.uid() and app_private.active_owner()) or app_private.public_profile(u.id));
$$;
create function public.save_social_profile(p_username text,p_display_name text,p_bio text,p_avatar uuid,p_expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
declare previous uuid; asset public.media_assets;
begin
 if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
 select avatar_asset_id into previous from public.profiles where id=auth.uid() for update;
 if p_avatar is not null then
   perform 1 from public.media_assets where id=p_avatar and owner_id=auth.uid() and purpose='profile_avatar' and status='ready' for update;
   if not found then raise exception 'invalid_avatar' using errcode='22023'; end if;
 end if;
 update public.profiles set username=lower(btrim(p_username)),display_name=btrim(p_display_name),bio=btrim(p_bio),
   avatar_asset_id=p_avatar,profile_published=true,version=version+1
   where id=auth.uid() and version=p_expected_version;
 if not found then raise exception 'conflict' using errcode='PT409'; end if;
 if previous is not null and previous is distinct from p_avatar then
   update public.media_assets set status='deleting' where id=previous returning * into asset;
   perform app_private.queue_media_cleanup(asset);
 end if;
end; $$;

-- Preserve the old profile RPC while making its edits visible to version checks.
create or replace function public.update_profile(p_username text,p_display_name text,p_bio text,p_timezone text)
returns public.profiles language plpgsql security definer set search_path='' as $$
declare result public.profiles;
begin
 if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
 if not exists(select 1 from pg_catalog.pg_timezone_names where name=p_timezone) then raise exception 'validation' using errcode='22023'; end if;
 update public.profiles set username=lower(btrim(p_username)),display_name=btrim(p_display_name),bio=p_bio,timezone=p_timezone,version=version+1 where id=auth.uid() returning * into result;
 return result;
end; $$;

drop function public.social_feed(timestamptz,uuid,uuid);
create function public.social_feed(p_before timestamptz default null,p_before_id uuid default null,p_id uuid default null,p_author uuid default null,p_following boolean default false)
returns table(id uuid,owner_id uuid,username text,display_name text,pet_name text,category text,asset_id uuid,content text,created_at timestamptz,likes bigint,comments bigint,liked boolean,following boolean,avatar_asset_id uuid)
language sql stable security definer set search_path='' as $$
 select p.id,p.owner_id,u.username,u.display_name,t.name,t.category,p.asset_id,p.content,p.created_at,
  (select count(*) from public.post_likes l where l.post_id=p.id),
  (select count(*) from public.post_comments c where c.post_id=p.id),
  exists(select 1 from public.post_likes l where l.post_id=p.id and l.owner_id=auth.uid()),
  exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.owner_id),u.avatar_asset_id
 from public.posts p join public.profiles u on u.id=p.owner_id join public.pets t on t.id=p.pet_id
 where app_private.public_post(p.id) and (p_id is null or p.id=p_id) and (p_author is null or p.owner_id=p_author)
  and (not p_following or (app_private.active_owner() and exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.owner_id)))
  and (p_before is null or (p.created_at,p.id)<(p_before,p_before_id))
 order by p.created_at desc,p.id desc limit 20;
$$;
create index public_feed_cursor on public.posts(created_at desc,id desc) where visibility='public' and status='published' and deleted_at is null;

create or replace function public.social_people(p_search text default '')
returns table(id uuid,username text,display_name text,following boolean)
language sql stable security definer set search_path='' as $$
 select u.id,u.username,u.display_name,exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=u.id)
 from public.profiles u where app_private.public_profile(u.id) and u.id is distinct from auth.uid()
  and (u.username ilike '%'||left(p_search,30)||'%' or u.display_name ilike '%'||left(p_search,30)||'%')
 order by u.username,u.id limit 20;
$$;

create or replace function public.social_asset(p_asset uuid) returns text
language sql stable security definer set search_path='' as $$
 select a.display_key from public.media_assets a where a.id=p_asset and a.status='ready'
  and (exists(select 1 from public.posts p where p.asset_id=a.id and app_private.public_post(p.id))
   or exists(select 1 from public.stories s where s.asset_id=a.id and app_private.visible_story(s.id))
   or exists(select 1 from public.profiles u where u.avatar_asset_id=a.id and u.account_state='active' and (u.id=auth.uid() or app_private.public_profile(u.id))));
$$;
create or replace function public.own_story_assets() returns uuid[]
language sql stable security definer set search_path='' as $$
 select coalesce(array_agg(asset_id),'{}'::uuid[]) from (
  select asset_id from public.stories where owner_id=auth.uid() and deleted_at is null and app_private.active_owner()
  union select avatar_asset_id from public.profiles where id=auth.uid() and avatar_asset_id is not null and app_private.active_owner()
 ) used;
$$;
create or replace function app_private.protect_story_asset() returns trigger
language plpgsql security definer set search_path='' as $$
begin
 if TG_TABLE_NAME='media_assets' then
  if new.status='deleting' and old.status<>'deleting' and (
   exists(select 1 from public.stories where asset_id=old.id and deleted_at is null)
   or exists(select 1 from public.profiles where avatar_asset_id=old.id)) then raise exception 'in_use' using errcode='23503'; end if;
 else
  if exists(select 1 from public.stories where asset_id=new.asset_id) then raise exception 'in_use' using errcode='23503'; end if;
 end if;
 return new;
end; $$;
-- Repeated follow requests stay idempotent at the cap.
create or replace function public.set_follow(p_target uuid,p_follow boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not app_private.active_owner() or p_target=auth.uid() or not exists(select 1 from public.profiles where id=p_target and account_state='active') then raise exception 'forbidden' using errcode='42501'; end if;
 if p_follow then
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,731));
  if exists(select 1 from public.follows where follower_id=auth.uid() and following_id=p_target) then return; end if;
  if (select count(*) from public.follows where follower_id=auth.uid())>=1000 then raise exception 'quota' using errcode='54000'; end if;
  insert into public.follows values(auth.uid(),p_target,now());
 else delete from public.follows where follower_id=auth.uid() and following_id=p_target; end if;
end; $$;
revoke all on function public.social_profile(text),public.social_feed(timestamptz,uuid,uuid,uuid,boolean) from public;
grant execute on function public.social_profile(text),public.social_feed(timestamptz,uuid,uuid,uuid,boolean) to anon,authenticated;
revoke all on function public.save_social_profile(text,text,text,uuid,integer) from public,anon;
grant execute on function public.save_social_profile(text,text,text,uuid,integer) to authenticated;
notify pgrst,'reload schema';
commit;
