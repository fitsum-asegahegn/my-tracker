-- Run after migration-005.sql. Security fix.
-- Before: a partner who learned a habit's id could insert check-ins into someone else's habit.
-- 1) remove any forged rows  2) only allow logs on YOUR OWN habits  3) stop exposing habit ids to partners.
delete from habit_logs l using habits h where h.id=l.habit_id and h.user_id<>l.user_id;
drop policy if exists own_habit_logs on habit_logs;
create policy own_habit_logs on habit_logs for all using (user_id=auth.uid())
 with check (user_id=auth.uid() and exists(select 1 from habits h where h.id=habit_id and h.user_id=auth.uid()));
create or replace function partner_view() returns jsonb language sql security definer set search_path=public as $$
 select coalesce(jsonb_agg(jsonb_build_object('owner',p.owner_id,'name',pr.name,'start',pr.start_day,'habits',
  (select coalesce(jsonb_agg(jsonb_build_object('name',h.name,'pillar',h.pillar,'freq',h.freq,
    'logs',(select coalesce(jsonb_agg(l.day),'[]'::jsonb) from habit_logs l where l.habit_id=h.id and l.day>=current_date-60)) order by h.sort),'[]'::jsonb)
   from habits h where h.user_id=p.owner_id))),'[]'::jsonb)
 from partners p join profiles pr on pr.id=p.owner_id where lower(p.partner_email)=lower(auth.jwt()->>'email') $$;
