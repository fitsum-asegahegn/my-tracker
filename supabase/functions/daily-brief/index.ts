import {createClient} from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import {createECDH} from 'node:crypto';import {Buffer} from 'node:buffer';
const clean=(s?:string)=>(s||'').trim().replace(/^["']|["']$/g,'').replace(/=+$/,'');
// Reads the VAPID secrets defensively: strips quotes/padding, derives the true public key from the private key, normalises the subject.
function vapidCfg(){const pub0=clean(Deno.env.get('VAPID_PUBLIC')),priv=clean(Deno.env.get('VAPID_PRIVATE'));if(!pub0||!priv)return null;let pub=pub0;
  try{const e=createECDH('prime256v1');e.setPrivateKey(Buffer.from(priv,'base64url'));pub=e.getPublicKey().toString('base64url')}catch(_){}
  const raw=(Deno.env.get('VAPID_SUBJECT')||'').trim(),subject=raw.startsWith('https:')?raw:'mailto:'+(raw.replace(/^mailto:/,'')||'me@example.com');
  return {pub,priv,subject,mismatch:pub!==pub0}}
const PER:Record<string,number>={d:1,w:7,m:30,m2:60,m6:180,y:365};
const EM:Record<string,string>={faith:'✝️',class:'📚',social:'🤝'};
const mins=(t:string)=>{const m=/(\d{1,2}):(\d{2})\s*([ap]m)?/i.exec(t||'');if(!m)return null;let h=+m[1];const ap=(m[3]||'').toLowerCase();if(ap==='pm'&&h<12)h+=12;if(ap==='am'&&h===12)h=0;return h*60+ +m[2]};
const f12=(m:number)=>`${Math.floor(m/60)%12||12}:${String(m%60).padStart(2,'0')} ${Math.floor(m/60)<12?'AM':'PM'}`;
const fmtT=(t:string)=>{const p=(t||'').match(/\d{1,2}:\d{2}\s*(?:[ap]m)?/gi);if(!p||p.length<2)return t;const a=mins(p[0]),b=mins(p[1]);if(a==null||b==null)return t;return (a<720)===(b<720)?f12(a).replace(/ [AP]M$/,'')+'–'+f12(b):f12(a)+' – '+f12(b)};
Deno.serve(async(req)=>{
  const cs=Deno.env.get('CRON_SECRET'),sk=Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authed=(cs&&req.headers.get('x-cron-secret')===cs)||(sk&&req.headers.get('Authorization')===`Bearer ${sk}`);
  if(!authed)return new Response('unauthorized: send header x-cron-secret matching the CRON_SECRET secret',{status:401}); // only the cron job may call this
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const token=Deno.env.get('TELEGRAM_BOT_TOKEN'),vp=Deno.env.get('VAPID_PUBLIC'),vs=Deno.env.get('VAPID_PRIVATE');
  const V=vapidCfg();if(V)webpush.setVapidDetails(V.subject,V.pub,V.priv);
  const A=new Date(Date.now()+3*3600e3),today=A.toISOString().slice(0,10),wd=A.getUTCDay(),mins=A.getUTCHours()*60+A.getUTCMinutes();
  const toM=(t:string)=>{const [h,m]=(t||'00:00').split(':');return +h*60+ +m};
  const due=(t:string,last:string|null)=>mins>=toM(t)&&mins-toM(t)<=120&&last!==today; // 2h catch-up window
  const gap=(a:string,b:string)=>Math.round((+new Date(a)-+new Date(b))/864e5);
  const getHabits=async(uid:string)=>((await db.from('habits').select('name,pillar,freq,habit_logs(day)').eq('user_id',uid).order('sort')).data??[]).map((h:any)=>({...h,logs:(h.habit_logs??[]).map((l:any)=>l.day).sort()}));
  async function deliver(uid:string,chat:string|null,text:string,title:string,body:string){
    let ok=false;
    if(!token)out.errors.push('TELEGRAM_BOT_TOKEN secret is not set');else if(!chat)out.errors.push('no Telegram chat id saved in Settings');
    else{const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:chat,text})});if(r.ok)ok=true;else out.errors.push('telegram: '+(await r.text()))}
    if(vp&&vs){const {data:subs}=await db.from('push_subs').select('*').eq('user_id',uid);
      for(const s of subs??[]){try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title,body}));ok=true}
        catch(e:any){if(e.statusCode===404||e.statusCode===410)await db.from('push_subs').delete().eq('endpoint',s.endpoint);else out.errors.push('push: '+(e.statusCode||e.message))}}}
    return ok}
  const out={reminders:0,summaries:0,nudges:0,errors:[] as string[],addisTime:A.toISOString().slice(0,16)+' (UTC+3 shifted)'};
  const {data:profs}=await db.from('profiles').select('*');
  const {data:nd}=await db.from('nudges').select('*').eq('delivered',false).limit(50);
  for(const n of nd??[]){const o=(profs??[]).find((q:any)=>q.id===n.owner_id);
    if(o)await deliver(o.id,o.tg_chat,`🤍 ${n.from_name}: ${n.message}`,`${n.from_name} sent you a nudge`,n.message);
    await db.from('nudges').update({delivered:true}).eq('id',n.id);out.nudges++}
  for(const p of profs??[]){
    const slots=(['am','pm'] as const).filter(s=>due(s==='am'?p.tg_am:p.tg_pm,s==='am'?p.last_am:p.last_pm));
    if(!slots.length)continue;
    const [hs,{data:ss},{data:fr}]=await Promise.all([getHabits(p.id),
      db.from('sessions').select('time,name,room').eq('user_id',p.id).eq('day',wd).order('time'),
      db.from('friends').select('name,every,last,created').eq('user_id',p.id)]);
    const open=hs.filter((h:any)=>{const last=h.logs[h.logs.length-1];if(h.freq==='d')return last!==today;return gap(today,last??p.start_day)>=PER[h.freq]-2&&last!==today});
    const call=(fr??[]).map((f:any)=>({n:f.name,g:gap(today,f.last??f.created),e:f.every})).filter(f=>f.g>=f.e).sort((a,b)=>b.g/b.e-a.g/a.e).slice(0,3);
    for(const slot of slots){
      const L=[slot==='am'?'🌅 Good morning, '+p.name:'🌙 Evening check',''];
      if(slot==='am'&&ss?.length)L.push('📚 Today:',...ss.map((s:any)=>`• ${fmtT(s.time)} ${s.name}${s.room?' ('+s.room+')':''}`),'');
      L.push(open.length?'⏳ Still open:\n'+open.slice(0,8).map((h:any)=>'• '+h.name).join('\n'):'🎉 All on track');
      if(call.length)L.push('','🤝 Call today:',...call.map(f=>`• ${f.n} (${f.g} days)`));
      const sent=await deliver(p.id,p.tg_chat,L.join('\n'),slot==='am'?'ሕይወቴ — good morning':'ሕይወቴ — evening check',open.length?`${open.length} still open${call.length?` · call ${call[0].n}`:''}`:'All on track 🎉');
      if(sent){await db.from('profiles').update(slot==='am'?{last_am:today}:{last_pm:today}).eq('id',p.id);out.reminders++} // only mark done when delivered, so a failed send retries on the next tick
    }
  }
  // Sunday 19:00–23:59 Addis: weekly summary to each partner
  if(wd===0&&mins>=19*60){
    const {data:ps}=await db.from('partners').select('*').or(`last_summary.is.null,last_summary.neq.${today}`);
    const byOwner=new Map<string,any[]>();for(const x of ps??[])byOwner.set(x.owner_id,[...(byOwner.get(x.owner_id)??[]),x]);
    let users:any[]|null=null;
    for(const [oid,list] of byOwner){
      const o=(profs??[]).find((q:any)=>q.id===oid);if(!o||o.weekly_summary===false)continue;
      const hs=await getHabits(oid),inWeek=(h:any)=>h.logs.filter((d:string)=>gap(today,d)<7&&gap(today,d)>=0).length;
      const days=new Set<string>();hs.forEach((h:any)=>h.logs.forEach((d:string)=>{if(gap(today,d)<7&&gap(today,d)>=0)days.add(d)}));
      const L=[`📋 Weekly summary: ${o.name}`,`Active days: ${days.size}/7`,''];
      for(const k of ['faith','class','social']){const g=hs.filter((h:any)=>h.pillar===k);if(!g.length)continue;
        L.push(`${EM[k]} ${k[0].toUpperCase()+k.slice(1)}`,...g.map((h:any)=>h.freq==='d'?`• ${h.name}: ${inWeek(h)}/7 days`:`• ${h.name}: ${inWeek(h)?'done ✓':'not this week'}`),'')}
      const late=hs.filter((h:any)=>h.freq!=='d'&&h.freq!=='w'&&gap(today,h.logs[h.logs.length-1]??o.start_day)>=PER[h.freq]);
      if(late.length)L.push('⚠️ Overdue: '+late.map((h:any)=>h.name).join(', '));
      const text=L.join('\n');
      for(const x of list){
        if(!users)users=(await db.auth.admin.listUsers({perPage:1000})).data.users;
        const u=users!.find((q:any)=>q.email?.toLowerCase()===x.partner_email.toLowerCase());if(!u)continue; // partner has not signed up yet
        const pp=(profs??[]).find((q:any)=>q.id===u.id);
        if(await deliver(u.id,pp?.tg_chat??null,text,`Weekly summary: ${o.name}`,`${days.size}/7 active days`)){await db.from('partners').update({last_summary:today}).eq('id',x.id);out.summaries++}}}
  }
  return new Response(JSON.stringify(out),{headers:{'Content-Type':'application/json'}});
});
