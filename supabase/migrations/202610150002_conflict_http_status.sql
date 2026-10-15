begin;

-- 40001 is reserved for retryable transaction failures. PostgREST may retry it
-- indefinitely; application version/ownership conflicts must return HTTP 409.
-- Keep deployed migrations immutable and replace only our public RPC bodies.
do $$
declare routine record; definition text;
begin
  for routine in
    select p.oid from pg_catalog.pg_proc p
    join pg_catalog.pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and p.proname in (
      'save_growth_record', 'save_pet', 'delete_pet', 'upsert_growth_record',
      'delete_growth_record', 'save_private_post', 'delete_private_post', 'finish_media'
    ) and p.prokind = 'f'
  loop
    definition := pg_catalog.pg_get_functiondef(routine.oid);
    if position('''40001''' in definition) > 0 then
      execute replace(definition, '''40001''', '''PT409''');
    end if;
  end loop;
end; $$;

notify pgrst, 'reload schema';
commit;
