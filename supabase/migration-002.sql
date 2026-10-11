-- Run once AFTER schema.sql. Adds timetable, friends and a key-value store (hours, matrix, roadmap, jobs).
create table if not exists sessions(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, day int not null check(day between 0 and 6), time text, name text not null, room text, who text, track text default 'CDS');
create table if not exists friends(id uuid primary key default gen_random_uuid(), user_id uuid not null references auth.users on delete cascade, name text not null, every int default 14, last date, created date default current_date);
create table if not exists kv(user_id uuid not null references auth.users on delete cascade, key text not null, value jsonb, primary key(user_id,key));
alter table sessions enable row level security; alter table friends enable row level security; alter table kv enable row level security;
do $$ declare t text; begin foreach t in array array['sessions','friends','kv'] loop
 execute format('drop policy if exists own_%1$s on %1$s; create policy own_%1$s on %1$s for all using (user_id=auth.uid()) with check (user_id=auth.uid())',t); end loop; end $$;
create or replace function seed_class(uid uuid) returns void language sql security definer set search_path=public as $$
 insert into sessions(user_id,day,time,name,room,who,track) values
 (uid,2,'14:00–17:00','Advanced Problem Solving','NB 114','Dr. Beakal','AI'),(uid,3,'08:30–11:30','AI Principles & Techniques','NB 015','Dr. Natnael','AI'),
 (uid,1,'08:30–10:30','Pedagogy','NB 114','Dr. Meseret','AI'),(uid,4,'14:00–16:00','Robotics & Intelligent Systems','NB 015','Dr. Adane','AI'),
 (uid,5,'08:30–11:30','Machine Learning','NB 015','Dr. Fantahun','AI'),(uid,0,'10:00–12:00','Teach: Meserete Haymanot (Grade 5)','Sunday school','','Faith');
$$;
create or replace function seed_class_trg() returns trigger language plpgsql security definer set search_path=public as $$ begin perform seed_class(new.id); return new; end $$;
drop trigger if exists on_profile on profiles; create trigger on_profile after insert on profiles for each row execute function seed_class_trg();
select seed_class(p.id) from profiles p where not exists(select 1 from sessions s where s.user_id=p.id);
