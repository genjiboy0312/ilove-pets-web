begin;
create extension if not exists pg_cron with schema pg_catalog;
create extension if not exists pg_net with schema extensions;
-- Never place the token in cron.job.command. Both the Vault view and pg_net queues
-- contain privileged values and must not be available to browser database roles.
revoke all on schema vault from public,anon,authenticated;
revoke all on all tables in schema net from public,anon,authenticated;
revoke all on all sequences in schema net from public,anon,authenticated;
revoke all on schema net from public,anon,authenticated;
do $$
declare secret_id uuid;
begin
 select id into secret_id from vault.secrets where name='ilove_pets_maintenance_token';
 if secret_id is null then perform vault.create_secret('__MAINTENANCE_SECRET__','ilove_pets_maintenance_token');
 else perform vault.update_secret(secret_id,'__MAINTENANCE_SECRET__'); end if;
 select id into secret_id from vault.secrets where name='ilove_pets_project_url';
 if secret_id is null then perform vault.create_secret('__PROJECT_URL__','ilove_pets_project_url');
 else perform vault.update_secret(secret_id,'__PROJECT_URL__'); end if;
end; $$;
create or replace function app_private.run_scheduled_maintenance() returns bigint
language sql security definer set search_path='' as $$
 select net.http_post(
 url:=(select decrypted_secret from vault.decrypted_secrets where name='ilove_pets_project_url')||'/functions/v1/maintenance',
 headers:=jsonb_build_object('Content-Type','application/json','Authorization','Bearer '||(select decrypted_secret from vault.decrypted_secrets where name='ilove_pets_maintenance_token')),
 body:='{}'::jsonb,timeout_milliseconds:=60000);
$$;
revoke all on function app_private.run_scheduled_maintenance() from public,anon,authenticated,service_role;
select cron.schedule('ilove-pets-maintenance','*/15 * * * *','select app_private.run_scheduled_maintenance();');
commit;
