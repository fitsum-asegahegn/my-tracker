-- Run after migration-002.sql. Realtime, push subscriptions, accountability partners.
do $$ declare t text; begin foreach t in array array['habits','habit_logs','plan_items','friends','kv','sessions','profiles'] loop
 begin execute format('alter publication supabase_realtime add table %I',t); exception when others then null; end; end loop; end $$;
create table if not exists push_subs(endpoint text primary key, user_id uuid not null references auth.users on delete cascade, p256dh text, auth text);
create table if not exists partners(id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users on delete cascade, partner_email text not null, unique(owner_id,partner_email));
alter table push_subs enable row level security; alter table partners enable row level security;
drop policy if exists own_push on push_subs; create policy own_push on push_subs for all using (user_id=auth.uid()) with check (user_id=auth.uid());
drop policy if exists own_partners on partners; create policy own_partners on partners for all using (owner_id=auth.uid()) with check (owner_id=auth.uid());
-- A partner sees ONLY habit names, frequencies and 60 days of check-ins: no friends, tasks, Telegram ID or notes.
create or replace function partner_view() returns jsonb language sql security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('owner',p.owner_id,'name',pr.name,'start',pr.start_day,'habits',
  (select coalesce(jsonb_agg(jsonb_build_object('id',h.id,'name',h.name,'pillar',h.pillar,'freq',h.freq,
    'logs',(select coalesce(jsonb_agg(l.day),'[]'::jsonb) from habit_logs l where l.habit_id=h.id and l.day>=current_date-60)) order by h.sort),'[]'::jsonb)
   from habits h where h.user_id=p.owner_id))),'[]'::jsonb)
 from partners p join profiles pr on pr.id=p.owner_id where lower(p.partner_email)=lower(auth.jwt()->>'email') $$;
