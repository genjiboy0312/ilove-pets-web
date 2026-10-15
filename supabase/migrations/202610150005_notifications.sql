begin;
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  recipient_id uuid not null references public.profiles(id) on delete cascade,
  actor_id uuid not null references public.profiles(id) on delete cascade,
  kind text not null check(kind in ('follow','like','comment')),
  source_id uuid not null,
  post_id uuid references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(), read_at timestamptz,
  unique(recipient_id,actor_id,kind,source_id), check(recipient_id<>actor_id)
);
create index notifications_recipient_cursor on public.notifications(recipient_id,created_at desc,id desc);
alter table public.notifications enable row level security;
revoke all on public.notifications from public,anon,authenticated;
grant all on public.notifications to service_role;

create function app_private.notify_social() returns trigger
language plpgsql security definer set search_path='' as $$
declare recipient uuid; actor uuid; source uuid; post uuid; kind text;
begin
  if tg_table_name='follows' then
    recipient:=new.following_id; actor:=new.follower_id; source:=actor; kind:='follow';
  else
    select owner_id into recipient from public.posts where id=new.post_id;
    actor:=new.owner_id; post:=new.post_id;
    if tg_table_name='post_likes' then source:=post; kind:='like';
    else source:=new.id; kind:='comment'; end if;
  end if;
  if recipient is not null and recipient<>actor then
    insert into public.notifications(recipient_id,actor_id,kind,source_id,post_id)
      values(recipient,actor,kind,source,post) on conflict do nothing;
  end if;
  return new;
end; $$;
revoke all on function app_private.notify_social() from public,anon,authenticated;
create trigger notify_follow after insert on public.follows for each row execute function app_private.notify_social();
create trigger notify_like after insert on public.post_likes for each row execute function app_private.notify_social();
create trigger notify_comment after insert on public.post_comments for each row execute function app_private.notify_social();

create function app_private.visible_notification(n public.notifications) returns boolean
language sql stable security definer set search_path='' as $$
  select n.recipient_id=auth.uid() and app_private.active_owner()
    and exists(select 1 from public.profiles where id=n.actor_id and account_state='active')
    and case n.kind
      when 'follow' then exists(select 1 from public.follows where follower_id=n.actor_id and following_id=n.recipient_id)
      when 'like' then app_private.public_post(n.post_id) and exists(select 1 from public.post_likes where post_id=n.post_id and owner_id=n.actor_id)
      when 'comment' then app_private.public_post(n.post_id) and exists(select 1 from public.post_comments where id=n.source_id and post_id=n.post_id and owner_id=n.actor_id)
      else false end;
$$;
revoke all on function app_private.visible_notification(public.notifications) from public,anon,authenticated;
create function public.notifications_feed(p_before timestamptz default null,p_before_id uuid default null)
returns table(id uuid,kind text,actor_name text,actor_username text,post_id uuid,created_at timestamptz,read_at timestamptz)
language sql stable security definer set search_path='' as $$
  select n.id,n.kind,u.display_name,
    case when app_private.public_profile(u.id) then u.username else null end,
    n.post_id,n.created_at,n.read_at
  from public.notifications n join public.profiles u on u.id=n.actor_id
  where n.recipient_id=auth.uid() and app_private.visible_notification(n)
    and (p_before is null or (n.created_at,n.id)<(p_before,p_before_id))
  order by n.created_at desc,n.id desc limit 30;
$$;
create function public.notifications_unread() returns bigint
language sql stable security definer set search_path='' as $$
  select count(*) from public.notifications n where n.recipient_id=auth.uid() and n.read_at is null and app_private.visible_notification(n);
$$;
create function public.read_notification(p_id uuid) returns void
language plpgsql security definer set search_path='' as $$
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  update public.notifications n set read_at=coalesce(read_at,now()) where id=p_id and recipient_id=auth.uid() and app_private.visible_notification(n);
  if not found then raise exception 'not_found' using errcode='PT404'; end if;
end; $$;
create function public.read_all_notifications() returns void
language plpgsql security definer set search_path='' as $$
begin
  if not app_private.active_owner() then raise exception 'unauthorized' using errcode='42501'; end if;
  update public.notifications n set read_at=now() where recipient_id=auth.uid() and read_at is null and app_private.visible_notification(n);
end; $$;
revoke all on function public.notifications_feed(timestamptz,uuid),public.notifications_unread(),public.read_notification(uuid),public.read_all_notifications() from public,anon;
grant execute on function public.notifications_feed(timestamptz,uuid),public.notifications_unread(),public.read_notification(uuid),public.read_all_notifications() to authenticated;
commit;
