import {createClient} from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
import {coachMessage,weekStudy,fmtTime} from '../_shared/coach.ts';
import {createECDH} from 'node:crypto';import {Buffer} from 'node:buffer';
const clean=(s?:string)=>(s||'').trim().replace(/^["']|["']$/g,'').replace(/=+$/,'');
// Reads the VAPID secrets defensively: strips quotes/padding, derives the true public key from the private key, normalises the subject.
function vapidCfg(){const pub0=clean(Deno.env.get('VAPID_PUBLIC')),priv=clean(Deno.env.get('VAPID_PRIVATE'));if(!pub0||!priv)return null;let pub=pub0;
  try{const e=createECDH('prime256v1');e.setPrivateKey(Buffer.from(priv,'base64url'));pub=e.getPublicKey().toString('base64url')}catch(_){}
  const raw=(Deno.env.get('VAPID_SUBJECT')||'').trim(),subject=raw.startsWith('https:')?raw:'mailto:'+(raw.replace(/^mailto:/,'')||'me@example.com');
  return {pub,priv,subject,mismatch:pub!==pub0}}
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  const json=(o:unknown,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...cors,'Content-Type':'application/json'}});
  const jwt=(req.headers.get('Authorization')||'').replace('Bearer ','');
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data:{user}}=await db.auth.getUser(jwt);            // only a signed-in user can test, and only for themselves
  if(!user)return json({error:'not signed in'},401);
  const body=await req.json().catch(()=>({}));
  if(body.coach){ // preview: build today's coach message for this user and send it to their Telegram
    const slot=body.coach==='am'?'am':'pm',A=new Date(Date.now()+3*3600e3),today=A.toISOString().slice(0,10),gp=(a:string,b:string)=>Math.round((+new Date(a)-+new Date(b))/864e5);
    const [{data:h},{data:ss},{data:fr},{data:kvr},{data:pr}]=await Promise.all([db.from('habits').select('name,pillar,freq,habit_logs(day)').eq('user_id',user.id).order('sort'),db.from('sessions').select('time,name,room').eq('user_id',user.id).eq('day',A.getUTCDay()).order('time'),db.from('friends').select('name,every,last,created').eq('user_id',user.id),db.from('kv').select('key,value').eq('user_id',user.id).in('key',['studylog','target']),db.from('profiles').select('name,tg_chat,start_day').eq('id',user.id).single()]);
    const KV:any=Object.fromEntries((kvr??[]).map((r:any)=>[r.key,r.value])),call=(fr??[]).map((f:any)=>({n:f.name,g:gp(today,f.last??f.created),e:f.every})).filter((f:any)=>f.g>=f.e).sort((a:any,b:any)=>b.g/b.e-a.g/a.e).slice(0,3);
    const R=await coachMessage({slot,name:pr?.name||'friend',hs:(h??[]).map((x:any)=>({name:x.name,pillar:x.pillar,freq:x.freq,logs:(x.habit_logs??[]).map((l:any)=>l.day)})),today,frac:slot==='am'?.06:.9,age:gp(today,pr?.start_day||today),study:weekStudy(KV.studylog,today),target:KV.target||10,
      classes:(ss??[]).map((s:any)=>`${fmtTime(s.time)} ${s.name}${s.room?' ('+s.room+')':''}`),call:call.map((f:any)=>`${f.n} (${f.g} days)`),used:[],lastHeads:[],apiKey:Deno.env.get('ANTHROPIC_API_KEY'),model:Deno.env.get('CLAUDE_MODEL')});
    let tg=false;const token=Deno.env.get('TELEGRAM_BOT_TOKEN');if(token&&pr?.tg_chat){tg=(await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:pr.tg_chat,text:R.text})})).ok}
    return json({text:R.text,telegram:tg});
  }
  const out={push:0,removed:0,serverKey:'',telegram:false,errors:[] as string[]};
  const V=vapidCfg(),token=Deno.env.get('TELEGRAM_BOT_TOKEN');
  const [{data:subs},{data:p}]=await Promise.all([db.from('push_subs').select('*').eq('user_id',user.id),db.from('profiles').select('tg_chat,name').eq('id',user.id).single()]);
  if(!V)out.errors.push('VAPID_PUBLIC / VAPID_PRIVATE secrets are not set');
  else{out.serverKey=V.pub;if(V.mismatch)out.errors.push('VAPID_PUBLIC secret does not match VAPID_PRIVATE (using the key derived from the private one)');webpush.setVapidDetails(V.subject,V.pub,V.priv);
    if(!subs?.length)out.errors.push('no device is subscribed yet: tap Enable on this device first');
    for(const s of subs??[]){try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title:'ሕይወቴ — test',body:'Push notifications work on this device ✅'}));out.push++}
      catch(e:any){out.errors.push('push '+(e.statusCode||e.message));if([403,404,410].includes(e.statusCode)){await db.from('push_subs').delete().eq('endpoint',s.endpoint);out.removed++}}}}
  if(token&&p?.tg_chat){const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:p.tg_chat,text:'✅ Test from ሕይወቴ: Telegram works.'})});out.telegram=r.ok;if(!r.ok)out.errors.push('telegram: '+(await r.text()))}
  return json(out);
});
