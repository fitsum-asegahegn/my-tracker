-- Run after migration-003.sql. Per-user reminder times + Sunday partner summary.
alter table profiles add column if not exists last_am date;
alter table profiles add column if not exists last_pm date;
alter table profiles add column if not exists weekly_summary boolean default true;
alter table partners add column if not exists last_summary date;
-- Replace the two fixed cron jobs with ONE job every 15 minutes (the function decides who is due, in Addis time).
-- Fill in REF and SERVICE_ROLE_KEY, then run:
create extension if not exists pg_cron; create extension if not exists pg_net;
do $$ begin perform cron.unschedule('brief-am'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('brief-pm'); exception when others then null; end $$;
do $$ begin perform cron.unschedule('brief-tick'); exception when others then null; end $$;
select cron.schedule('brief-tick','*/15 * * * *',$$select net.http_post('https://REF.supabase.co/functions/v1/daily-brief','{}'::jsonb,headers:='{"Authorization":"Bearer SERVICE_ROLE_KEY","Content-Type":"application/json"}'::jsonb)$$);
