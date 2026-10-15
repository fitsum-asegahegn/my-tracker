// Coach brain: analyses habit data and writes the morning / evening message. Pure functions + an optional AI rewrite.
export type H={name:string,pillar:string,freq:string,logs:string[]};
export type Opts={slot:'am'|'pm',name:string,hs:H[],today:string,frac:number,age:number,study:number,target:number,classes:string[],call:string[],used:string[],lastHeads:string[],apiKey?:string,model?:string};
const PER:Record<string,number>={d:1,w:7,m:30,m2:60,m6:180,y:365};
const PN:Record<string,string>={faith:'Faith',class:'Class',social:'Social'},DOW=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
const RANK:Record<string,number>={zero:0,weak:1,ok:2,strong:3,na:3};
const day=(d:string,n=0)=>{const x=new Date(d+'T00:00:00Z');x.setUTCDate(x.getUTCDate()+n);return x.toISOString().slice(0,10)};
const gap=(a:string,b:string)=>Math.round((+new Date(a)-+new Date(b))/864e5);
export const weekStudy=(log:Record<string,number>|undefined,today:string)=>{const dow=(new Date(today).getUTCDay()+6)%7;let s=0;for(let i=0;i<=dow;i++)s+=(log||{})[day(today,-i)]||0;return s};

const MORN=['“Let us not grow weary of doing good” (Gal 6:9). Small steps today still count.','A righteous person falls seven times and rises again (Prov 24:16). Rise, and start small.','“I can do all things through Christ who strengthens me” (Phil 4:13). You will need that today.','Those who wait on the Lord renew their strength (Isa 40:31). Start with prayer; the rest follows.','“Be steadfast, immovable, always abounding in the work of the Lord” (1 Cor 15:58).','Whatever you do, work heartily as for the Lord (Col 3:23). That includes Python and problem sets.','Discipline is a gift to your future self. One honest day beats ten perfect plans.','You do not need a perfect day. You need the next right action. What is it?','Your faith, your degree, your friendships: all built by days exactly like today.','Consistency is quiet. Show up today even when nobody is watching.'];
const PRAISE=['🏆 Full marks tonight. Faith, class and friends all on plan. This is how a life gets built.','🔥 You did what you said you would. Remember this feeling when tomorrow feels hard.','👏 Clean sheet. No excuses needed because you gave none.','🌟 Strong day across all three pillars. Be proud, thank God, then sleep well.','✅ Plan completed. This is what discipline looks like from the inside.','🙌 Well done. Give thanks for the strength, then rest.','💪 Today you proved you can. Now make it a pattern.','🎯 Every box ticked. Tomorrow, repeat. Do not change the formula.'];
const ANGRY=['😠 ZERO on {p} so far this week. That is not a plan, that is a wish.','🚨 {p}: nothing. You wrote this plan yourself. Honor it.','😤 No more "tomorrow". {p} has had nothing and that stops tonight.','⛔ I am not impressed. {p} is empty. You are capable of better, so act like it.','🔥 Wake up. Zero on {p}. Fix it before you sleep.','😡 Enough excuses. {p} gets your attention tonight, not next week.'];
const PENALTY=['No scrolling until you have done 10 minutes of it.','Tomorrow it comes FIRST, before breakfast and before your phone.','Pay it back: 10 extra minutes tomorrow.','Tell a friend or your confessor what you skipped.'];
const CLOSE=['Rest now. Tomorrow is a fresh page.','Sleep well and start tomorrow with prayer.','Tomorrow you decide who you are again. Decide well.','Small steps, every day. Goodnight.','Be kind to yourself and keep your word. Goodnight.','Lord have mercy, then get up and try again tomorrow.'];
const AP:Record<string,string[]>={
 prayer:['Attach it to an anchor: pray before you touch your phone, right after waking.','Split it: half in the morning, half in the evening, so neither feels heavy.','Start with only the first section for 5 minutes. Starting is the whole battle.','Stand at the same spot each day (a window, a corner) so the place cues the prayer.','Pray while you walk to class. Time you already have.'],
 code:['The 20-minute rule: open the editor and code for just 20 minutes. Stopping is allowed after.','Write tomorrow\'s first small task on paper tonight so you start without deciding.','Study straight after your last class, before going home, when you are already in study mode.','Fix one tiny bug or finish one tiny exercise. A small win restarts momentum.','Block two 45-minute sessions in the Week tab now, as appointments you cannot cancel.'],
 social:['Send a 30-second voice note instead of calling. Easier, and still real.','Pair the call with a walk so it takes no extra time.','Put one specific name and time in your Week planner today.','Ask one friend to be your weekly check-in partner, and do the same for them.'],
 church:['Check the service time now and add it to the Week tab so it is not a decision on the day.','Go with a friend; ask someone to wait for you at the door.','Prepare the night before: clothes, bag, and an alarm labelled with the service.'],
 job:['Apply to just one today, with a saved template. Quantity first, polish later.','Schedule a fixed "job hour" in the Week tab and protect it like a class.'],
 gen:['Make it smaller until it is almost too easy, then do it every day.','Attach it to something you already do daily.','Schedule it in the Week tab so it has a time, not just an intention.']};
const cat=(n:string)=>/ውዳሴ|መዝሙ|ስግደት|pray/i.test(n)?'prayer':/code|python|study/i.test(n)?'code':/friend|call|hang/i.test(n)?'social':/ማስቀደስ|ጉባኤ|church|ንስሐ|ቁርባን|ጸበል|ገዳም|ምጽዋት|አስራት|ማስተማር/i.test(n)?'church':/job|appl/i.test(n)?'job':'gen';

function pick(kind:string,a:string[],used:string[],ids:string[]){const all=a.map((t,i)=>({t,id:kind+i})),c=all.filter(x=>!used.includes(x.id)),x=(c.length?c:all)[Math.floor(Math.random()*(c.length||all.length))];ids.push(x.id);return x.t}

export function analyze(o:Opts){
 const dow=(new Date(o.today).getUTCDay()+6)%7,ws=day(o.today,-dow),P:any={};
 for(const k of ['faith','class','social']){const g=o.hs.filter(h=>h.pillar===k),exp=g.reduce((s,h)=>s+7/PER[h.freq],0)*(dow+o.frac)/7,done=g.reduce((s,h)=>s+h.logs.filter(d=>d>=ws&&d<=o.today).length,0),r=exp<1?1:done/exp;
  P[k]={pct:exp<1&&done===0?0:Math.min(100,Math.round(r*100)),tier:exp<1?(done>0?'strong':'na'):done===0&&exp>=2?'zero':r>=.9?'strong':r>=.6?'ok':'weak'}}
 const sp=o.target*(dow+o.frac)/7;if(sp>=1.5&&o.study<sp*.5&&RANK[P.class.tier]>1)P.class.tier=o.study===0?'zero':'weak';
 const daily=o.hs.filter(h=>h.freq==='d').map(h=>{const last=[...h.logs].sort().pop();return {h,never:!last,g:last?gap(o.today,last):Math.min(o.age,30),r14:h.logs.filter(d=>gap(o.today,d)>=0&&gap(o.today,d)<14).length/14,done:h.logs.includes(o.today)}});
 const miss=Array(7).fill(0),tot=Array(7).fill(0);for(let i=1;i<=28;i++){const d=day(o.today,-i),w=new Date(d).getUTCDay();daily.forEach(x=>{tot[w]++;if(!x.h.logs.includes(d))miss[w]++})}
 const rate=miss.map((m,i)=>tot[i]?m/tot[i]:0),avg=miss.reduce((a,b)=>a+b,0)/Math.max(1,tot.reduce((a,b)=>a+b,0)),wi=rate.indexOf(Math.max(...rate));
 const pattern=o.age>=10&&rate[wi]>=.7&&rate[wi]-avg>=.15?{day:DOW[wi],pct:Math.round(rate[wi]*100)}:null;
 let streak=0;for(let i=o.hs.some(h=>h.logs.includes(o.today))?0:1;;i++){const d=day(o.today,-i);if(o.hs.some(h=>h.logs.includes(d)))streak++;else break;if(i>400)break}
 return {P,daily,pattern,streak,open:daily.filter(x=>!x.done)}}

export async function coachMessage(o:Opts){
 const ids:string[]=[],A=analyze(o),order=['faith','class','social'].sort((a,b)=>RANK[A.P[a].tier]-RANK[A.P[b].tier]),wp=order[0],wt=A.P[wp].tier;
 const wh=[...A.daily].filter(x=>x.h.pillar===wp).sort((a,b)=>a.r14-b.r14||b.g-a.g)[0]?.h.name,ac=wp==='class'?'code':wp==='social'?'social':cat(wh||'');
 const pc=(k:string)=>A.P[k].tier==='na'?'–':A.P[k].pct+'%',approach=pick('ap'+ac,AP[ac],o.used,ids),L:string[]=[];
 if(o.slot==='am'){
  L.push(`🌅 Good morning, ${o.name}`,'',pick('mo',MORN,o.used,ids),'');
  if(o.classes.length)L.push('📚 Today:',...o.classes.map(c=>'• '+c),'');
  L.push(RANK[wt]<3?`🎯 Focus: ${PN[wp]} is at ${A.P[wp].pct}% of this week's plan so far. Try this: ${approach}`:`🎯 You are on track. Protect the ${A.streak}-day streak.`);
  if(A.open.length)L.push('','⏳ Start with:',...A.open.slice(0,4).map(x=>'• '+x.h.name));
  if(o.call.length)L.push('','🤝 Call today: '+o.call.slice(0,3).join(', '));
 }else{
  L.push(`🌙 Evening check, ${o.name}`,`Faith ${pc('faith')} · Class ${pc('class')} · Social ${pc('social')} of this week's plan so far`,'');
  if(order.every(k=>['strong','na'].includes(A.P[k].tier))&&order.some(k=>A.P[k].tier==='strong')&&!A.open.length)L.push(pick('pr',PRAISE,o.used,ids));
  else{
   for(const k of order){const t=A.P[k].tier;
    if(t==='strong')L.push(`✅ ${PN[k]}: strong (${A.P[k].pct}%). Keep it up.`);
    else if(t==='na')L.push(`➖ ${PN[k]}: nothing due yet this week.`);
    else if(t==='ok')L.push(`🙂 ${PN[k]}: ${A.P[k].pct}%. A little more and it is solid.`);
    else if(t==='weak')L.push(`⚠️ ${PN[k]} is at ${A.P[k].pct}% of the plan. Not good enough yet, and you know it.`);
    else L.push(pick('an',ANGRY,o.used,ids).replace('{p}',PN[k]),'Consequence: '+pick('pe',PENALTY,o.used,ids)+(wh&&k===wp?` (${wh})`:''))}
   if(A.open.length)L.push('','Still open today: '+A.open.slice(0,4).map(x=>x.h.name).join(', '));
   if(A.pattern)L.push('',`📊 Pattern: you miss your daily habits most on ${A.pattern.day}s (${A.pattern.pct}% missed over 4 weeks). Plan that day on purpose.`);
   const gw=[...A.daily].sort((a,b)=>b.g-a.g)[0];if(gw&&gw.g>=2)L.push(gw.never?`⏳ ${gw.h.name}: not done even once yet.`:`⏳ ${gw.h.name}: ${gw.g} days since you last did it.`);
   if(RANK[wt]<3)L.push('',`💡 A different approach for ${PN[wp]}: ${approach}`)}
  L.push('',pick('cl',CLOSE,o.used,ids));
 }
 return {text:await rewrite(L.join('\n'),o),ids}}

const SYS='Rewrite the Telegram message below for Fitsum, an Ethiopian Orthodox Christian master\'s student. Keep EVERY fact and number, keep the same tone (praise stays praise; firm stays firm but never insulting or attacking his worth), keep the single suggested approach but phrase it freshly. Change the opening and wording so it feels new each day. Plain text, a few emojis, under 900 characters, no markdown, no new facts.';
async function rewrite(draft:string,o:Opts){if(!o.apiKey)return draft;
 try{const r=await fetch('https://api.anthropic.com/v1/messages',{method:'POST',headers:{'x-api-key':o.apiKey,'anthropic-version':'2023-06-01','content-type':'application/json'},body:JSON.stringify({model:o.model||'claude-haiku-5-5',max_tokens:700,system:SYS,messages:[{role:'user',content:`Previous openings (do not repeat): ${o.lastHeads.join(' | ')}\n\nDRAFT:\n${draft}`}]})});
  const j=await r.json(),t=j?.content?.[0]?.text;return t&&t.length>40&&t.length<2500?t.trim():draft}catch(_){return draft}}

// 12-hour class time for messages (stored times are 24h)
const m2=(t:string)=>{const m=/(\d{1,2}):(\d{2})\s*([ap]m)?/i.exec(t||'');if(!m)return null;let h=+m[1];const ap=(m[3]||'').toLowerCase();if(ap==='pm'&&h<12)h+=12;if(ap==='am'&&h===12)h=0;return h*60+ +m[2]};
const f12=(m:number)=>`${Math.floor(m/60)%12||12}:${String(m%60).padStart(2,'0')} ${Math.floor(m/60)<12?'AM':'PM'}`;
export const fmtTime=(t:string)=>{const p=(t||'').match(/\d{1,2}:\d{2}\s*(?:[ap]m)?/gi);if(!p||p.length<2)return t;const a=m2(p[0]),b=m2(p[1]);if(a==null||b==null)return t;return (a<720)===(b<720)?f12(a).replace(/ [AP]M$/,'')+'–'+f12(b):f12(a)+' – '+f12(b)};
