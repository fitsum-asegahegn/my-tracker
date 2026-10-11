-- Run once in Supabase SQL Editor. Safe to re-run.
create table if not exists profiles(id uuid primary key references auth.users on delete cascade, name text, tg_chat text, tg_am time default '07:00', tg_pm time default '20:30', alms int default 500, start_day date default current_date);
create table if not exists habits(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, key text, name text not null, pillar text not null check (pillar in ('faith','class','social')), freq text not null check (freq in ('d','w','m','m2','m6','y')), sort int default 0);
create table if not exists habit_logs(habit_id uuid references habits on delete cascade, user_id uuid not null references auth.users on delete cascade, day date not null, primary key(habit_id,day));
create table if not exists plan_items(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, quarter text, title text, done boolean default false, sort int default 0);
alter table profiles enable row level security; alter table habits enable row level security; alter table habit_logs enable row level security; alter table plan_items enable row level security;
do $$ declare t text; begin foreach t in array array['habits','habit_logs','plan_items'] loop
 execute format('drop policy if exists own_%1$s on %1$s; create policy own_%1$s on %1$s for all using (user_id=auth.uid()) with check (user_id=auth.uid())',t); end loop; end $$;
drop policy if exists own_profiles on profiles; create policy own_profiles on profiles for all using (id=auth.uid()) with check (id=auth.uid());

create or replace function seed_user() returns trigger language plpgsql security definer set search_path=public as $$
begin
 insert into profiles(id,name) values(new.id,split_part(new.email,'@',1));
 insert into habits(user_id,name,pillar,freq,sort) select new.id,n,p,f,row_number() over() from (values
  ('ውዳሴ ማርያም (የዕለቱ)','faith','d'),('መዝሙረ ዳዊት (የዕለቱ)','faith','d'),('ስግደት (ፍትሐ ነገሥት)','faith','d'),('ረቡዕና ዓርብ ጾም','faith','w'),
  ('እሑድ ማስቀደስ','faith','w'),('የሰርክ ጉባኤ መማር','faith','w'),('መሠረተ እምነት ማስተማር (እሑድ 10:00–12:00)','faith','w'),
  ('ንስሐ አባትን ማግኘት','faith','m'),('አስራት በኩራት','faith','m'),('ምጽዋት','faith','m'),('ቅዱስ ቁርባን (ስጋ ወደሙ)','faith','m2'),
  ('ጸበል መጠመቅ','faith','m6'),('ወደ ገዳም መሄድ','faith','y'),
  ('Coding practice (Python)','class','d'),('Weekly notes review','class','w'),('Job applications (3)','class','w'),
  ('Call or meet a friend','social','w'),('Group hangout','social','m')) v(n,p,f);
 insert into plan_items(user_id,quarter,title,sort) select new.id,q,t,row_number() over() from (values
  ('Q1 Oct–Dec 2026 · Explore & decide','Decision day: keep AI or CDS (Nov 10)'),('Q1 Oct–Dec 2026 · Explore & decide','Python basics + 20 coding days'),
  ('Q1 Oct–Dec 2026 · Explore & decide','Refresh CV and portfolio; list 30 target employers'),
  ('Q2 Jan–Mar 2027 · Build','First ML project online'),('Q2 Jan–Mar 2027 · Build','12 job applications'),
  ('Q3 Apr–Jun 2027 · Ship','Deep learning project'),('Q3 Apr–Jun 2027 · Ship','Gedam pilgrimage'),
  ('Q4 Jul–Sep 2027 · Land & review','Job offer or paid role'),('Q4 Jul–Sep 2027 · Land & review','Yearly review + 2020 EC plan')) v(q,t);
 return new; end $$;
drop trigger if exists on_signup on auth.users; create trigger on_signup after insert on auth.users for each row execute function seed_user();
-- Telegram cron (after deploying the function + setting secrets). Ethiopia = UTC+3, so 04:00 UTC = 07:00 and 17:30 UTC = 20:30.
-- create extension if not exists pg_cron; create extension if not exists pg_net;
-- select cron.schedule('brief-am','0 4 * * *',$$select net.http_post('https://REF.supabase.co/functions/v1/daily-brief','{"slot":"am"}'::jsonb,headers:='{"Authorization":"Bearer SERVICE_ROLE_KEY","Content-Type":"application/json"}'::jsonb)$$);
-- select cron.schedule('brief-pm','30 17 * * *',$$select net.http_post('https://REF.supabase.co/functions/v1/daily-brief','{"slot":"pm"}'::jsonb,headers:='{"Authorization":"Bearer SERVICE_ROLE_KEY","Content-Type":"application/json"}'::jsonb)$$);
