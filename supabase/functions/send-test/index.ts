import {createClient} from 'npm:@supabase/supabase-js@2';
import webpush from 'npm:web-push@3.6.7';
const cors={'Access-Control-Allow-Origin':'*','Access-Control-Allow-Headers':'authorization, x-client-info, apikey, content-type','Access-Control-Allow-Methods':'POST, OPTIONS'};
Deno.serve(async(req)=>{
  if(req.method==='OPTIONS')return new Response('ok',{headers:cors});
  const json=(o:unknown,s=200)=>new Response(JSON.stringify(o),{status:s,headers:{...cors,'Content-Type':'application/json'}});
  const jwt=(req.headers.get('Authorization')||'').replace('Bearer ','');
  const db=createClient(Deno.env.get('SUPABASE_URL')!,Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
  const {data:{user}}=await db.auth.getUser(jwt);            // only a signed-in user can test, and only for themselves
  if(!user)return json({error:'not signed in'},401);
  const out={push:0,telegram:false,errors:[] as string[]};
  const vp=Deno.env.get('VAPID_PUBLIC'),vs=Deno.env.get('VAPID_PRIVATE'),token=Deno.env.get('TELEGRAM_BOT_TOKEN');
  const [{data:subs},{data:p}]=await Promise.all([db.from('push_subs').select('*').eq('user_id',user.id),db.from('profiles').select('tg_chat,name').eq('id',user.id).single()]);
  if(!vp||!vs)out.errors.push('VAPID_PUBLIC / VAPID_PRIVATE secrets are not set');
  else{webpush.setVapidDetails('mailto:'+(Deno.env.get('VAPID_SUBJECT')||'me@example.com'),vp,vs);
    if(!subs?.length)out.errors.push('no device is subscribed yet: tap Enable on this device first');
    for(const s of subs??[]){try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title:'ሕይወቴ — test',body:'Push notifications work on this device ✅'}));out.push++}
      catch(e:any){out.errors.push('push '+(e.statusCode||e.message));if(e.statusCode===404||e.statusCode===410)await db.from('push_subs').delete().eq('endpoint',s.endpoint)}}}
  if(token&&p?.tg_chat){const r=await fetch(`https://api.telegram.org/bot${token}/sendMessage`,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({chat_id:p.tg_chat,text:'✅ Test from ሕይወቴ: Telegram works.'})});out.telegram=r.ok;if(!r.ok)out.errors.push('telegram: '+(await r.text()))}
  return json(out);
});
