begin;

create table public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key(follower_id,following_id), check(follower_id<>following_id)
);
create table public.post_likes (
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  primary key(post_id,owner_id)
);
create table public.post_comments (
  id uuid primary key,
  post_id uuid not null references public.posts(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check(char_length(btrim(content)) between 1 and 500),
  created_at timestamptz not null default now()
);
create index comments_post_cursor on public.post_comments(post_id,created_at,id);
create table public.stories (
  id uuid primary key,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  asset_id uuid not null unique,
  caption text not null default '' check(char_length(caption)<=200),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now()+interval '24 hours',
  deleted_at timestamptz,
  foreign key(asset_id,owner_id) references public.media_assets(id,owner_id),
  check(expires_at=created_at+interval '24 hours')
);
create index stories_owner_expiry on public.stories(owner_id,expires_at desc);
create table public.story_views (
  story_id uuid not null references public.stories(id) on delete cascade,
  owner_id uuid not null references public.profiles(id) on delete cascade,
  primary key(story_id,owner_id)
);
alter table public.follows enable row level security;
alter table public.post_likes enable row level security;
alter table public.post_comments enable row level security;
alter table public.stories enable row level security;
alter table public.story_views enable row level security;
-- All access is through bounded projections/RPCs. No table read exposes private profiles.
revoke all on public.follows,public.post_likes,public.post_comments,public.stories,public.story_views from public,anon,authenticated;
grant all on public.follows,public.post_likes,public.post_comments,public.stories,public.story_views to service_role;

create function app_private.public_post(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select exists(select 1 from public.posts p join public.profiles u on u.id=p.owner_id
    join public.media_assets a on a.id=p.asset_id
    where p.id=p_id and p.visibility='public' and p.status='published' and p.deleted_at is null
    and u.account_state='active' and a.status='ready');
$$;
create function app_private.visible_story(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
  select app_private.active_owner() and exists(select 1 from public.stories s
    join public.profiles u on u.id=s.owner_id join public.media_assets a on a.id=s.asset_id
    where s.id=p_id and s.deleted_at is null and s.expires_at>now() and u.account_state='active' and a.status='ready'
    and (s.owner_id=auth.uid() or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=s.owner_id)));
$$;
revoke all on function app_private.public_post(uuid),app_private.visible_story(uuid) from public,anon,authenticated;

create function public.set_post_visibility(p_id uuid,p_public boolean,p_expected_version integer) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  update public.posts set visibility=case when p_public then 'public' else 'private' end,version=version+1
    where id=p_id and owner_id=auth.uid() and deleted_at is null and status='published' and version=p_expected_version;
  if not found then raise exception 'conflict' using errcode='PT409'; end if;
end; $$;

create function public.social_feed(p_before timestamptz default null,p_before_id uuid default null,p_id uuid default null)
returns table(id uuid,owner_id uuid,username text,display_name text,pet_name text,category text,asset_id uuid,content text,created_at timestamptz,likes bigint,comments bigint,liked boolean,following boolean)
language sql stable security definer set search_path='' as $$
  select p.id,p.owner_id,u.username,u.display_name,t.name,t.category,p.asset_id,p.content,p.created_at,
    (select count(*) from public.post_likes l where l.post_id=p.id),
    (select count(*) from public.post_comments c where c.post_id=p.id),
    exists(select 1 from public.post_likes l where l.post_id=p.id and l.owner_id=auth.uid()),
    exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=p.owner_id)
  from public.posts p join public.profiles u on u.id=p.owner_id join public.pets t on t.id=p.pet_id
  where app_private.public_post(p.id) and (p_id is null or p.id=p_id)
    and (p_before is null or (p.created_at,p.id)<(p_before,p_before_id))
  order by p.created_at desc,p.id desc limit 20;
$$;
create function public.social_people(p_search text default '')
returns table(id uuid,username text,display_name text,following boolean)
language sql stable security definer set search_path='' as $$
  select u.id,u.username,u.display_name,
    exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=u.id)
  from public.profiles u where u.account_state='active' and u.id is distinct from auth.uid()
    and exists(select 1 from public.posts p where p.owner_id=u.id and app_private.public_post(p.id))
    and (u.username ilike '%'||left(p_search,30)||'%' or u.display_name ilike '%'||left(p_search,30)||'%')
  order by u.username,u.id limit 20;
$$;
create function public.set_follow(p_target uuid,p_follow boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not app_private.active_owner() or p_target=auth.uid() or not exists(select 1 from public.profiles where id=p_target and account_state='active')
    then raise exception 'forbidden' using errcode='42501'; end if;
  if p_follow then
    perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,731));
    if (select count(*) from public.follows where follower_id=auth.uid())>=1000 then raise exception 'quota' using errcode='54000'; end if;
    insert into public.follows values(auth.uid(),p_target,now()) on conflict do nothing;
  else delete from public.follows where follower_id=auth.uid() and following_id=p_target; end if;
end; $$;
create function public.set_post_like(p_post uuid,p_liked boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  perform 1 from public.posts where id=p_post for update;
  if not app_private.public_post(p_post) then raise exception 'not_found' using errcode='PT404'; end if;
  if p_liked then insert into public.post_likes values(p_post,auth.uid()) on conflict do nothing;
  else delete from public.post_likes where post_id=p_post and owner_id=auth.uid(); end if;
end; $$;
create function public.social_comments(p_post uuid,p_before timestamptz default null,p_before_id uuid default null)
returns table(id uuid,owner_id uuid,username text,content text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
  select c.id,c.owner_id,u.username,c.content,c.created_at from public.post_comments c join public.profiles u on u.id=c.owner_id
  where c.post_id=p_post and app_private.public_post(p_post) and u.account_state='active'
    and (p_before is null or (c.created_at,c.id)<(p_before,p_before_id))
  order by c.created_at desc,c.id desc limit 30;
$$;
create function public.save_social_comment(p_id uuid,p_post uuid,p_content text) returns void
language plpgsql security definer set search_path='' as $$
declare existing public.post_comments;
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  perform 1 from public.posts where id=p_post for update;
  if not app_private.public_post(p_post) then raise exception 'not_found' using errcode='PT404'; end if;
  select * into existing from public.post_comments where id=p_id;
  if existing.id is not null then
    if existing.owner_id<>auth.uid() or existing.post_id<>p_post or existing.content<>btrim(p_content) then raise exception 'conflict' using errcode='PT409'; end if;
    return;
  end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,732));
  if (select count(*) from public.post_comments where owner_id=auth.uid() and created_at>now()-interval '1 hour')>=60 then raise exception 'quota' using errcode='54000'; end if;
  insert into public.post_comments values(p_id,p_post,auth.uid(),btrim(p_content),now());
end; $$;
create function public.delete_social_comment(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  delete from public.post_comments c using public.posts p where c.id=p_id and c.post_id=p.id and (c.owner_id=auth.uid() or p.owner_id=auth.uid());
  if not found then raise exception 'forbidden' using errcode='42501'; end if;
end; $$;

create function public.create_story(p_id uuid,p_asset uuid,p_caption text) returns void
language plpgsql security definer set search_path='' as $$
declare existing public.stories;
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,733));
  select * into existing from public.stories where id=p_id;
  if existing.id is not null then
    if existing.owner_id<>auth.uid() or existing.asset_id<>p_asset or existing.caption<>p_caption or existing.deleted_at is not null then raise exception 'conflict' using errcode='PT409'; end if;
    return;
  end if;
  perform 1 from public.media_assets where id=p_asset and owner_id=auth.uid() and status='ready' and purpose='post_photo' for update;
  if not found or exists(select 1 from public.posts where asset_id=p_asset) then raise exception 'invalid_media' using errcode='22023'; end if;
  if (select count(*) from public.stories where owner_id=auth.uid() and expires_at>now() and deleted_at is null)>=20 then raise exception 'quota' using errcode='54000'; end if;
  insert into public.stories(id,owner_id,asset_id,caption) values(p_id,auth.uid(),p_asset,p_caption);
end; $$;
create function public.delete_story(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
declare target public.stories; asset public.media_assets;
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  select * into target from public.stories where id=p_id and owner_id=auth.uid() for update;
  if not found then raise exception 'forbidden' using errcode='42501'; end if;
  if target.deleted_at is not null then return; end if;
  update public.stories set deleted_at=now() where id=p_id;
  update public.media_assets set status='deleting' where id=target.asset_id returning * into asset;
  perform app_private.queue_media_cleanup(asset);
end; $$;
create function public.expire_own_stories() returns void
language plpgsql security definer set search_path='' as $$
declare target record;
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  for target in select id from public.stories where owner_id=auth.uid() and expires_at<=now() and deleted_at is null loop
    perform public.delete_story(target.id);
  end loop;
end; $$;
create function public.stories_feed()
returns table(id uuid,owner_id uuid,username text,display_name text,asset_id uuid,caption text,created_at timestamptz,expires_at timestamptz,viewed boolean,views bigint)
language sql stable security definer set search_path='' as $$
  select s.id,s.owner_id,u.username,u.display_name,s.asset_id,s.caption,s.created_at,s.expires_at,
    exists(select 1 from public.story_views v where v.story_id=s.id and v.owner_id=auth.uid()),
    case when s.owner_id=auth.uid() then (select count(*) from public.story_views v where v.story_id=s.id) else null::bigint end
  from public.stories s join public.profiles u on u.id=s.owner_id where app_private.visible_story(s.id)
  order by (s.owner_id=auth.uid()) desc,s.created_at,s.id limit 200;
$$;
create function public.view_story(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not app_private.visible_story(p_id) then raise exception 'not_found' using errcode='PT404'; end if;
  if not exists(select 1 from public.stories where id=p_id and owner_id=auth.uid()) then
    insert into public.story_views values(p_id,auth.uid()) on conflict do nothing;
  end if;
end; $$;
create function public.own_story_assets() returns uuid[]
language sql stable security definer set search_path='' as $$
  select coalesce(array_agg(asset_id),'{}'::uuid[]) from public.stories
  where owner_id=auth.uid() and deleted_at is null and app_private.active_owner();
$$;
revoke all on function public.own_story_assets() from public,anon;
grant execute on function public.own_story_assets() to authenticated;
-- This projection is for the no-cache image proxy. Public/follower access never
-- grants direct Storage signing, so arbitrary long-lived signed URLs cannot be minted.
create function public.social_asset(p_asset uuid) returns text
language sql stable security definer set search_path='' as $$
  select a.display_key from public.media_assets a where a.id=p_asset and a.status='ready'
    and (exists(select 1 from public.posts p where p.asset_id=a.id and app_private.public_post(p.id))
      or exists(select 1 from public.stories s where s.asset_id=a.id and app_private.visible_story(s.id)));
$$;
-- Protect a live story from generic unused-photo cleanup and from reuse as a post.
create function app_private.protect_story_asset() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if TG_TABLE_NAME='media_assets' then
    if new.status='deleting' and old.status<>'deleting' and exists(select 1 from public.stories where asset_id=old.id and deleted_at is null) then
      raise exception 'in_use' using errcode='23503';
    end if;
  else
    if exists(select 1 from public.stories where asset_id=new.asset_id) then raise exception 'in_use' using errcode='23503'; end if;
  end if;
  return new;
end; $$;
create trigger story_asset_cleanup_guard before update on public.media_assets for each row execute function app_private.protect_story_asset();
create trigger story_asset_post_guard before insert or update of asset_id on public.posts for each row execute function app_private.protect_story_asset();
revoke all on function app_private.protect_story_asset() from public,anon,authenticated;

revoke all on function public.social_feed(timestamptz,uuid,uuid),public.social_people(text),public.social_comments(uuid,timestamptz,uuid),public.social_asset(uuid) from public;
grant execute on function public.social_feed(timestamptz,uuid,uuid),public.social_people(text),public.social_comments(uuid,timestamptz,uuid),public.social_asset(uuid) to anon,authenticated;
revoke all on function public.set_post_visibility(uuid,boolean,integer),public.set_follow(uuid,boolean),public.set_post_like(uuid,boolean),public.save_social_comment(uuid,uuid,text),public.delete_social_comment(uuid),public.create_story(uuid,uuid,text),public.delete_story(uuid),public.expire_own_stories(),public.stories_feed(),public.view_story(uuid) from public,anon;
grant execute on function public.set_post_visibility(uuid,boolean,integer),public.set_follow(uuid,boolean),public.set_post_like(uuid,boolean),public.save_social_comment(uuid,uuid,text),public.delete_social_comment(uuid),public.create_story(uuid,uuid,text),public.delete_story(uuid),public.expire_own_stories(),public.stories_feed(),public.view_story(uuid) to authenticated;
notify pgrst,'reload schema';
commit;
