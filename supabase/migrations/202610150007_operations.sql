begin;
create table public.account_deletion_jobs (
 id uuid primary key default gen_random_uuid(), owner_id uuid not null unique,
 status text not null default 'pending' check(status in ('pending','running','done','failed')),
 requested_at timestamptz not null default now(), not_before timestamptz not null default now()+interval '15 minutes',
 attempts integer not null default 0, lease_until timestamptz, lease_token uuid,
 next_attempt_at timestamptz not null default now(), completed_at timestamptz
);
create table public.user_blocks (
 owner_id uuid not null references public.profiles(id) on delete cascade,
 target_id uuid not null references public.profiles(id) on delete cascade,
 created_at timestamptz not null default now(), primary key(owner_id,target_id), check(owner_id<>target_id)
);
create table public.content_reports (
 id uuid primary key default gen_random_uuid(), reporter_id uuid references public.profiles(id) on delete set null,
 target_kind text not null check(target_kind in ('profile','post','comment','story')), target_id uuid not null,
 reason text not null check(reason in ('spam','harassment','privacy','other')),
 detail text not null default '' check(char_length(detail)<=500),
 status text not null default 'open' check(status in ('open','dismissed','hidden')),
 created_at timestamptz not null default now(), resolved_at timestamptz,
 unique(reporter_id,target_kind,target_id)
);
create table public.moderation_targets (
 target_kind text not null, target_id uuid not null, created_at timestamptz not null default now(),
 primary key(target_kind,target_id), check(target_kind in ('profile','post','comment','story'))
);
create table public.operations_runs (
 id uuid primary key default gen_random_uuid(), started_at timestamptz not null default now(),
 completed_at timestamptz, cleaned integer not null default 0, failed integer not null default 0
);
alter table public.cleanup_jobs add column next_attempt_at timestamptz not null default now();
alter table public.cleanup_jobs add column lease_until timestamptz;
alter table public.cleanup_jobs add column lease_token uuid;
create index cleanup_due on public.cleanup_jobs(next_attempt_at,created_at) where status<>'done';
create index reports_open on public.content_reports(created_at,id) where status='open';
create index user_blocks_target on public.user_blocks(target_id,owner_id);
alter policy profiles_read on public.profiles using(id=auth.uid() and app_private.active_owner());

alter table public.account_deletion_jobs enable row level security;
alter table public.user_blocks enable row level security;
alter table public.content_reports enable row level security;
alter table public.moderation_targets enable row level security;
alter table public.operations_runs enable row level security;
revoke all on public.account_deletion_jobs,public.user_blocks,public.content_reports,public.moderation_targets,public.operations_runs from public,anon,authenticated;
grant all on public.account_deletion_jobs,public.user_blocks,public.content_reports,public.moderation_targets,public.operations_runs to service_role;

create function app_private.blocked_pair(a uuid,b uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.user_blocks where (owner_id=a and target_id=b) or (owner_id=b and target_id=a));
$$;
create function app_private.moderated(kind text,target uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.moderation_targets where target_kind=kind and target_id=target);
$$;
-- Replace helpers in place so existing prepared callers retain their OIDs and
-- use the new visibility boundary without keeping an older callable projection.
create or replace function app_private.public_post(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.posts p join public.profiles u on u.id=p.owner_id
 join public.media_assets a on a.id=p.asset_id where p.id=p_id and p.visibility='public'
 and p.status='published' and p.deleted_at is null and u.account_state='active' and a.status='ready'
 and not app_private.moderated('post',p.id) and not app_private.moderated('profile',u.id)
 and not app_private.blocked_pair(auth.uid(),u.id));
$$;
create or replace function app_private.public_profile(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select exists(select 1 from public.profiles u where u.id=p_id and u.account_state='active'
 and not app_private.blocked_pair(auth.uid(),u.id) and not app_private.moderated('profile',u.id)
 and (u.profile_published or exists(select 1 from public.posts p where p.owner_id=u.id and app_private.public_post(p.id))));
$$;
create or replace function app_private.visible_story(p_id uuid) returns boolean
language sql stable security definer set search_path='' as $$
 select app_private.active_owner() and exists(select 1 from public.stories s
 join public.profiles u on u.id=s.owner_id join public.media_assets a on a.id=s.asset_id
 where s.id=p_id and s.deleted_at is null and s.expires_at>now() and u.account_state='active' and a.status='ready'
 and not app_private.blocked_pair(auth.uid(),u.id) and not app_private.moderated('story',s.id) and not app_private.moderated('profile',u.id)
 and (s.owner_id=auth.uid() or exists(select 1 from public.follows f where f.follower_id=auth.uid() and f.following_id=s.owner_id)));
$$;
create or replace function app_private.visible_notification(n public.notifications) returns boolean
language sql stable security definer set search_path='' as $$
 select n.recipient_id=auth.uid() and app_private.active_owner()
 and exists(select 1 from public.profiles where id=n.actor_id and account_state='active')
 and not app_private.blocked_pair(n.recipient_id,n.actor_id) and not app_private.moderated('profile',n.actor_id)
 and case n.kind
 when 'follow' then exists(select 1 from public.follows where follower_id=n.actor_id and following_id=n.recipient_id)
 when 'like' then app_private.public_post(n.post_id) and exists(select 1 from public.post_likes where post_id=n.post_id and owner_id=n.actor_id)
 when 'comment' then app_private.public_post(n.post_id) and exists(select 1 from public.post_comments where id=n.source_id and post_id=n.post_id and owner_id=n.actor_id) and not app_private.moderated('comment',n.source_id)
 else false end;
$$;
create or replace function public.social_comments(p_post uuid,p_before timestamptz default null,p_before_id uuid default null)
returns table(id uuid,owner_id uuid,username text,content text,created_at timestamptz)
language sql stable security definer set search_path='' as $$
 select c.id,c.owner_id,u.username,c.content,c.created_at from public.post_comments c join public.profiles u on u.id=c.owner_id
 where c.post_id=p_post and app_private.public_post(p_post) and u.account_state='active'
 and not app_private.blocked_pair(auth.uid(),c.owner_id) and not app_private.moderated('comment',c.id) and not app_private.moderated('profile',c.owner_id)
 and (p_before is null or (c.created_at,c.id)<(p_before,p_before_id)) order by c.created_at desc,c.id desc limit 30;
$$;
create function public.set_user_block(p_target uuid,p_block boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if not app_private.active_owner() or p_target=auth.uid() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_block then
  if not exists(select 1 from public.profiles where id=p_target and account_state='active') then raise exception 'not_found' using errcode='PT404'; end if;
  perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,740));
  if exists(select 1 from public.user_blocks where owner_id=auth.uid() and target_id=p_target) then return; end if;
  if (select count(*) from public.user_blocks where owner_id=auth.uid())>=1000 then raise exception 'quota' using errcode='54000'; end if;
  insert into public.user_blocks(owner_id,target_id) values(auth.uid(),p_target);
  delete from public.follows where (follower_id=auth.uid() and following_id=p_target) or (follower_id=p_target and following_id=auth.uid());
 else delete from public.user_blocks where owner_id=auth.uid() and target_id=p_target; end if;
end; $$;
create function public.blocked_users(p_after uuid default null)
returns table(id uuid,username text,display_name text)
language sql stable security definer set search_path='' as $$
 select p.id,p.username,p.display_name from public.user_blocks b join public.profiles p on p.id=b.target_id
 where b.owner_id=auth.uid() and app_private.active_owner() and (p_after is null or p.id>p_after) order by p.id limit 100;
$$;
create function app_private.social_write_guard() returns trigger
language plpgsql security definer set search_path='' as $$
declare target uuid;
begin
 if tg_table_name='follows' then target:=new.following_id;
 else select owner_id into target from public.posts where id=new.post_id; end if;
 if app_private.blocked_pair(auth.uid(),target) or app_private.moderated('profile',auth.uid()) or app_private.moderated('profile',target)
 then raise exception 'forbidden' using errcode='42501'; end if;
 return new;
end; $$;
create trigger block_follow_guard before insert on public.follows for each row execute function app_private.social_write_guard();
create trigger block_like_guard before insert on public.post_likes for each row execute function app_private.social_write_guard();
create trigger block_comment_guard before insert on public.post_comments for each row execute function app_private.social_write_guard();

create function public.report_content(p_kind text,p_target uuid,p_reason text,p_detail text default '') returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid;
begin
 if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
 if p_kind not in ('profile','post','comment','story') or p_reason not in ('spam','harassment','privacy','other') or char_length(p_detail)>500
 then raise exception 'validation' using errcode='22023'; end if;
 if not (case p_kind
 when 'profile' then app_private.public_profile(p_target) and p_target<>auth.uid()
 when 'post' then app_private.public_post(p_target) and exists(select 1 from public.posts where id=p_target and owner_id<>auth.uid())
 when 'comment' then exists(select 1 from public.post_comments c where c.id=p_target and c.owner_id<>auth.uid() and app_private.public_post(c.post_id))
 when 'story' then app_private.visible_story(p_target) and exists(select 1 from public.stories where id=p_target and owner_id<>auth.uid()) else false end)
 then raise exception 'not_found' using errcode='PT404'; end if;
 perform pg_catalog.pg_advisory_xact_lock(pg_catalog.hashtextextended(auth.uid()::text,741));
 select id into result from public.content_reports where reporter_id=auth.uid() and target_kind=p_kind and target_id=p_target;
 if result is not null then return result; end if;
 if (select count(*) from public.content_reports where reporter_id=auth.uid() and created_at>now()-interval '1 day')>=20
 then raise exception 'rate_limited' using errcode='PT429'; end if;
 insert into public.content_reports(reporter_id,target_kind,target_id,reason,detail) values(auth.uid(),p_kind,p_target,p_reason,btrim(coalesce(p_detail,''))) returning id into result;
 return result;
end; $$;
create function public.ops_resolve_report(p_id uuid,p_hide boolean) returns void
language plpgsql security definer set search_path='' as $$
declare r public.content_reports;
begin
 select * into r from public.content_reports where id=p_id for update;
 if r.id is null then raise exception 'not_found' using errcode='PT404'; end if;
 if r.status<>'open' then return; end if;
 if p_hide then insert into public.moderation_targets(target_kind,target_id) values(r.target_kind,r.target_id) on conflict do nothing; end if;
 update public.content_reports set status=case when p_hide then 'hidden' else 'dismissed' end,resolved_at=now() where id=p_id;
end; $$;

create function public.ops_begin_account_deletion(p_owner uuid) returns uuid
language plpgsql security definer set search_path='' as $$
declare result uuid; asset public.media_assets;
begin
 perform 1 from auth.users where id=p_owner for update;
 if not found then raise exception 'not_found' using errcode='PT404'; end if;
 insert into public.account_deletion_jobs(owner_id) values(p_owner) on conflict(owner_id) do nothing;
 select id into result from public.account_deletion_jobs where owner_id=p_owner;
 insert into public.profiles(id,username,account_state) values(p_owner,'pet_'||right(replace(p_owner::text,'-',''),24),'deleting') on conflict(id) do nothing;
 update public.profiles set account_state='deleting',avatar_asset_id=null,profile_published=false where id=p_owner;
 update public.posts set deleted_at=coalesce(deleted_at,now()),status='deleted',visibility='private' where owner_id=p_owner;
 update public.stories set deleted_at=coalesce(deleted_at,now()) where owner_id=p_owner;
 delete from public.local_import_items where owner_id=p_owner;
 for asset in select * from public.media_assets where owner_id=p_owner and status not in ('processing','deleted') for update loop
  update public.media_assets set status='deleting' where id=asset.id;
  perform app_private.queue_media_cleanup(asset);
 end loop;
 return result;
end; $$;

create or replace function public.finish_media(p_id uuid,p_owner uuid,p_bytes bigint,p_width integer,p_height integer) returns void
language plpgsql security definer set search_path='' as $$
begin
 perform 1 from public.profiles where id=p_owner and account_state='active' for share;
 if not found then raise exception 'forbidden' using errcode='42501'; end if;
 if p_bytes<1 or p_bytes>5242880 or p_width*p_height>8000000 then raise exception 'validation' using errcode='22023'; end if;
 update public.media_assets set status='ready',display_key=owner_id::text||'/'||id::text||'/display.webp',
 actual_bytes=p_bytes,reserved_bytes=expected_bytes+p_bytes,width=p_width,height=p_height where id=p_id and owner_id=p_owner and status='processing' and expires_at>now();
 if not found then raise exception 'conflict' using errcode='PT409'; end if;
end; $$;

create function public.ops_prepare_cleanup() returns integer
language plpgsql security definer set search_path='' as $$
declare item record; asset public.media_assets; total integer:=0;
begin
 -- Processing workers are not reclaimed at their short reservation expiry. A 24-hour
 -- quarantine exceeds the hosted worker wall-clock limit; self-hosted deployments must review it.
 for item in select id,asset_id from public.stories where deleted_at is null and expires_at<=now() order by expires_at limit 100 for update skip locked loop
  update public.stories set deleted_at=now() where id=item.id;
  update public.media_assets set status='deleting' where id=item.asset_id returning * into asset;
  perform app_private.queue_media_cleanup(asset); total:=total+1;
 end loop;
 for asset in select a.* from public.media_assets a where
  ((a.status in ('reserved','rejected') and a.expires_at<now()-interval '1 hour')
   or (a.status='processing' and a.expires_at<now()-interval '24 hours')
   or (a.status='ready' and a.created_at<now()-interval '24 hours'))
  and not exists(select 1 from public.posts where asset_id=a.id and deleted_at is null)
  and not exists(select 1 from public.stories where asset_id=a.id and deleted_at is null)
  and not exists(select 1 from public.profiles where avatar_asset_id=a.id)
  and not exists(select 1 from public.local_import_items where asset_id=a.id)
  order by a.created_at limit 100 for update skip locked loop
  update public.media_assets set status='deleting' where id=asset.id;
  perform app_private.queue_media_cleanup(asset); total:=total+1;
 end loop;
 delete from public.operations_runs where started_at<now()-interval '30 days';
 delete from public.content_reports where status<>'open' and resolved_at<now()-interval '90 days';
 delete from public.cleanup_jobs where status='done' and created_at<now()-interval '90 days';
 delete from public.account_deletion_jobs where status='done' and completed_at<now()-interval '90 days';
 return total;
end; $$;
create function public.ops_claim_cleanup(p_owner uuid default null) returns setof public.cleanup_jobs
language plpgsql security definer set search_path='' as $$
begin
 return query update public.cleanup_jobs j set status='running',attempts=j.attempts+1,lease_token=gen_random_uuid(),lease_until=now()+interval '10 minutes'
 where j.id in (select id from public.cleanup_jobs where (p_owner is null or owner_id=p_owner)
  and ((status in ('pending','failed') and next_attempt_at<=now()) or (status='running' and lease_until<now()))
  order by created_at,id limit 20 for update skip locked) returning j.*;
end; $$;
create function public.ops_finish_cleanup(p_id uuid,p_token uuid,p_success boolean) returns boolean
language plpgsql security definer set search_path='' as $$
declare target public.cleanup_jobs;
begin
 update public.cleanup_jobs set status=case when p_success then 'done' else 'failed' end,
 next_attempt_at=now()+least(interval '24 hours',interval '1 minute'*power(2,least(attempts,10))),lease_until=null
 where id=p_id and lease_token=p_token and status='running' returning * into target;
 if not found then return false; end if;
 if p_success then perform public.reconcile_media_cleanup(target.owner_id); end if;
 return true;
end; $$;
create function public.ops_claim_deletions() returns setof public.account_deletion_jobs
language plpgsql security definer set search_path='' as $$
begin
 return query update public.account_deletion_jobs j set status='running',attempts=j.attempts+1,lease_until=now()+interval '10 minutes',lease_token=gen_random_uuid()
 where j.id in (select d.id from public.account_deletion_jobs d where d.not_before<=now() and
 ((d.status in ('pending','failed') and d.next_attempt_at<=now()) or (d.status='running' and d.lease_until<now()))
 and not exists(select 1 from public.media_assets where owner_id=d.owner_id and status<>'deleted')
 and not exists(select 1 from public.cleanup_jobs where owner_id=d.owner_id and status<>'done')
 order by requested_at limit 5 for update skip locked) returning j.*;
end; $$;
create function public.ops_finish_deletion(p_id uuid,p_token uuid,p_success boolean) returns void
language plpgsql security definer set search_path='' as $$
begin
 if p_success and exists(select 1 from auth.users u join public.account_deletion_jobs j on j.owner_id=u.id where j.id=p_id)
 then raise exception 'auth_not_deleted' using errcode='PT409'; end if;
 update public.account_deletion_jobs set status=case when p_success then 'done' else 'failed' end,
 completed_at=case when p_success then now() else null end,next_attempt_at=now()+interval '15 minutes',lease_until=null
 where id=p_id and lease_token=p_token and status='running';
end; $$;
create function public.ops_health() returns jsonb language sql stable security definer set search_path='' as $$
 select jsonb_build_object('pendingCleanup',(select count(*) from public.cleanup_jobs where status<>'done'),
 'failedCleanup',(select count(*) from public.cleanup_jobs where status='failed'),
 'pendingDeletion',(select count(*) from public.account_deletion_jobs where status<>'done'),
 'failedDeletion',(select count(*) from public.account_deletion_jobs where status='failed'),
 'openReports',(select count(*) from public.content_reports where status='open'),
 'staleProcessing',(select count(*) from public.media_assets where status='processing' and expires_at<now()),
 'lastRun',(select max(completed_at) from public.operations_runs),
 'lastRunFailures',(select failed from public.operations_runs order by started_at desc limit 1));
$$;
-- No service RPC is executable by a browser role, including PostgreSQL's default PUBLIC grant.
revoke all on function app_private.blocked_pair(uuid,uuid),app_private.moderated(text,uuid),app_private.public_post(uuid),app_private.public_profile(uuid),app_private.visible_story(uuid),app_private.visible_notification(public.notifications),app_private.social_write_guard() from public,anon,authenticated;
revoke all on function public.set_user_block(uuid,boolean),public.blocked_users(uuid),public.report_content(text,uuid,text,text) from public,anon;
grant execute on function public.set_user_block(uuid,boolean),public.blocked_users(uuid),public.report_content(text,uuid,text,text) to authenticated;
revoke all on function public.ops_begin_account_deletion(uuid),public.ops_prepare_cleanup(),public.ops_claim_cleanup(uuid),public.ops_finish_cleanup(uuid,uuid,boolean),public.ops_claim_deletions(),public.ops_finish_deletion(uuid,uuid,boolean),public.ops_resolve_report(uuid,boolean),public.ops_health() from public,anon,authenticated;
grant execute on function public.ops_begin_account_deletion(uuid),public.ops_prepare_cleanup(),public.ops_claim_cleanup(uuid),public.ops_finish_cleanup(uuid,uuid,boolean),public.ops_claim_deletions(),public.ops_finish_deletion(uuid,uuid,boolean),public.ops_resolve_report(uuid,boolean),public.ops_health() to service_role;
notify pgrst,'reload schema';
commit;



