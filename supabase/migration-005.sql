-- Run after migration-004.sql. Partner nudges.
create table if not exists nudges(id uuid primary key default gen_random_uuid(), owner_id uuid not null references auth.users on delete cascade, from_email text not null, from_name text, message text not null check(char_length(message)<=140), created timestamptz default now(), read boolean default false, delivered boolean default false);
alter table nudges enable row level security;
drop policy if exists own_nudges_sel on nudges; create policy own_nudges_sel on nudges for select using (owner_id=auth.uid());
drop policy if exists own_nudges_upd on nudges; create policy own_nudges_upd on nudges for update using (owner_id=auth.uid()) with check (owner_id=auth.uid());
drop policy if exists own_nudges_del on nudges; create policy own_nudges_del on nudges for delete using (owner_id=auth.uid());
-- No insert policy on purpose: partners can only send through this function, which checks they really are a partner and rate-limits.
create or replace function send_nudge(p_owner uuid, p_msg text) returns void language plpgsql security definer set search_path=public as $$
declare me text := lower(auth.jwt()->>'email'); nm text;
begin
 if me is null then raise exception 'Sign in first.'; end if;
 if not exists(select 1 from partners where owner_id=p_owner and lower(partner_email)=me) then raise exception 'You are not a partner of this person.'; end if;
 if p_msg is null or char_length(trim(p_msg)) not between 1 and 140 then raise exception 'Message must be 1 to 140 characters.'; end if;
 if exists(select 1 from nudges where owner_id=p_owner and from_email=me and created>now()-interval '12 hours') then raise exception 'You already sent a nudge in the last 12 hours.'; end if;
 select name into nm from profiles where id=auth.uid();
 insert into nudges(owner_id,from_email,from_name,message) values(p_owner,me,coalesce(nm,split_part(me,'@',1)),trim(p_msg));
end $$;
do $$ begin execute 'alter publication supabase_realtime add table nudges'; exception when others then null; end $$;
