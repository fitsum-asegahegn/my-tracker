import {useEffect,useState,useCallback} from 'react';
import {sb} from './lib/supabase.js';
import ClassExtras,{TodayClasses} from './Class.jsx';import Friends from './Friends.jsx';import Charts,{Rings} from './Charts.jsx';import {Gauge,WeekPlanner,WeekCurve} from './Week.jsx';import Nudges from './Nudges.jsx';import Share from './Share.jsx';import {useRealtime} from './lib/realtime.js';import {makeReport} from './report.js';
import {PILLARS,FREQ,td,dd,eth,doneToday,isOk,daysLeft,score,streak} from './lib/logic.js';

function Auth(){const [e,setE]=useState(''),[p,setP]=useState(''),[m,setM]=useState(''),[up,setUp]=useState(false);
 const go=async()=>{setM('');const r=up?await sb.auth.signUp({email:e,password:p}):await sb.auth.signInWithPassword({email:e,password:p});if(r.error)setM(r.error.message);else if(up&&!r.data.session)setM('Check your email to confirm, then sign in.')};
 return <div className="auth"><h1 style={{fontSize:'2.2rem'}}>ሕይወቴ</h1><p className="mu">Faith, class and friends in one place.</p>
 <label>Email</label><input type="email" value={e} onChange={x=>setE(x.target.value)}/><label>Password</label><input type="password" value={p} onChange={x=>setP(x.target.value)}/>
 <button className="btn pri" onClick={go}>{up?'Create account':'Sign in'}</button> <button className="btn" onClick={()=>setUp(!up)}>{up?'I have an account':'New here'}</button><p className="mu">{m}</p></div>}


function Row({h,start,onToggle}){const on=doneToday(h),left=h.freq==='d'?1:daysLeft(h,start);const s=h.freq==='d'?streak(h):0;
 return <div className={'row '+(!isOk(h,start)&&h.freq!=='d'?'over':'')}><button className={'chk '+(on?'on':'')} style={on?{background:PILLARS[h.pillar].c}:{}} onClick={()=>onToggle(h)} aria-label={'toggle '+h.name}>{on?'✓':''}</button>
 <div className="t">{h.name}<small>{FREQ[h.freq]}{h.freq==='d'?(s?` · ${s}-day streak`:''):left>0?` · next due in ${left}d`:` · overdue ${-left}d`}</small></div></div>}

export default function App(){
 const [session,setSession]=useState(undefined),[hs,setHs]=useState([]),[plan,setPlan]=useState([]),[prof,setProf]=useState(null),[tab,setTab]=useState('today');
 useEffect(()=>{sb.auth.getSession().then(({data})=>setSession(data.session));const {data:l}=sb.auth.onAuthStateChange((_,s)=>setSession(s));return()=>l.subscription.unsubscribe()},[]);
 const load=useCallback(async()=>{const [h,p,pr]=await Promise.all([sb.from('habits').select('*,habit_logs(day)').order('sort'),sb.from('plan_items').select('*').order('sort'),sb.from('profiles').select('*').single()]);
  setHs((h.data||[]).map(x=>({...x,logs:(x.habit_logs||[]).map(l=>l.day)})));setPlan(p.data||[]);setProf(pr.data)},[]);
 useEffect(()=>{if(session)load()},[session,load]);
 useRealtime(['habit_logs','habits','plan_items','profiles'],()=>{if(session)load()});
 if(session===undefined)return null;if(!session)return <Auth/>;
 const start=prof?.start_day||td();
 const toggle=async h=>{const t=td(),on=h.logs.includes(t);
  setHs(x=>x.map(y=>y.id===h.id?{...y,logs:on?y.logs.filter(d=>d!==t):[...y.logs,t]}:y)); // optimistic
  const r=on?await sb.from('habit_logs').delete().match({habit_id:h.id,day:t}):await sb.from('habit_logs').insert({habit_id:h.id,user_id:session.user.id,day:t});
  if(r.error)load()};
 const togglePlan=async p=>{setPlan(x=>x.map(y=>y.id===p.id?{...y,done:!y.done}:y));await sb.from('plan_items').update({done:!p.done}).eq('id',p.id)};
 const saveProf=async patch=>{setProf({...prof,...patch});await sb.from('profiles').update(patch).eq('id',session.user.id)};
 const dl=30-dd(start,td());
 const pillar=k=>{const x=hs.filter(h=>h.pillar===k);return <><h1>{PILLARS[k].n} · {PILLARS[k].e}</h1>{['d','w','m','m2','m6','y'].map(f=>{const g=x.filter(h=>h.freq===f);return g.length?<div key={f}><div className="day">{FREQ[f]}</div><div className="card">{g.map(h=><Row key={h.id} h={h} start={start} onToggle={toggle}/>)}</div></div>:null})}</>};
 const views={
  today:()=><div className="dash"><div className="c12"><div className="mu">{td()} · {eth()} ዓ.ም</div><h1 style={{fontSize:'1.9rem',margin:'4px 0 14px'}}>Selam, {prof?.name||''}</h1><Nudges/>
   </div><div className="c5"><div className="card hero"><div className="rings"><Rings hs={hs} start={start}/></div><div className="legend">{Object.entries(PILLARS).map(([k,v])=><div key={k} style={{borderColor:v.c}}><span>{v.n}<br/><span className="mu">{v.e}</span></span><b style={{color:v.c}}>{score(hs,k,start)}%</b></div>)}</div></div>
   </div><div className="c7"><Gauge uid={session.user.id}/><div className="card" style={{borderColor:'var(--class)'}}><h3>{dl>0?`Day ${31-dl} of 30 — AI vs CDS decision in ${dl} days`:'Decision day has passed. Choose your track.'}</h3><div className="bar"><i style={{width:Math.min(100,(30-dl)/30*100)+'%',background:'var(--class)'}}/></div></div>
   </div><div className="c6"><TodayClasses/><h2>To do now</h2><div className="card">{hs.filter(h=>h.freq==='d'||!isOk(h,start)||doneToday(h)).map(h=><Row key={h.id} h={h} start={start} onToggle={toggle}/>)}</div></div><div className="c6"><Charts hs={hs}/></div></div>,
  faith:()=>pillar('faith'),class:()=><>{pillar('class')}<ClassExtras uid={session.user.id}/></>,social:()=><>{pillar('social')}<Friends uid={session.user.id}/></>,
  plan:()=>{const g={};plan.forEach(p=>(g[p.quarter]=g[p.quarter]||[]).push(p));const n=plan.filter(p=>p.done).length;
   return <><h1>Year plan</h1><p className="mu">{n}/{plan.length} complete</p><div className="bar"><i style={{width:(plan.length?n/plan.length*100:0)+'%',background:'var(--faith)'}}/></div>
   {Object.entries(g).map(([q,it])=><div key={q}><div className="day">{q}</div><div className="card">{it.map(p=><div className="row" key={p.id}><button className={'chk '+(p.done?'on':'')} style={p.done?{background:'var(--faith)'}:{}} onClick={()=>togglePlan(p)}>{p.done?'✓':''}</button><div className="t">{p.title}</div></div>)}</div></div>)}</>},
  week:()=><div className="dash"><div className="c12"><WeekPlanner uid={session.user.id}/></div><div className="c6"><WeekCurve hs={hs}/></div><div className="c6">{views.plan()}</div></div>,
  more:()=><><h1>Settings</h1><h2>Telegram</h2><div className="card"><p className="mu">Message your bot, then paste your chat ID (from @userinfobot). The bot token lives only in a server secret, never in this app.</p>
   <label>Chat ID</label><input defaultValue={prof?.tg_chat||''} onBlur={e=>saveProf({tg_chat:e.target.value.trim()||null})}/>
   <div className="form3" style={{gridTemplateColumns:'1fr 1fr'}}><div><label>Morning reminder</label><input type="time" defaultValue={(prof?.tg_am||'07:00').slice(0,5)} onBlur={e=>saveProf({tg_am:e.target.value||'07:00'})}/></div><div><label>Evening reminder</label><input type="time" defaultValue={(prof?.tg_pm||'20:30').slice(0,5)} onBlur={e=>saveProf({tg_pm:e.target.value||'20:30'})}/></div></div>
   <label style={{display:'flex',gap:10,alignItems:'center',margin:'0 0 12px'}}><input type="checkbox" style={{width:'auto',margin:0}} defaultChecked={prof?.weekly_summary!==false} onChange={e=>saveProf({weekly_summary:e.target.checked})}/>Send my weekly summary to my partner on Sundays (19:00)</label>
   <label>Monthly almsgiving (Birr)</label><input type="number" defaultValue={prof?.alms||500} onBlur={e=>saveProf({alms:+e.target.value})}/></div>
   <Share uid={session.user.id}/><h2>Report</h2><div className="card"><p className="mu">A PowerPoint of the last 30 days: scores, faith habits, class, social and plan.</p><button className="btn pri" onClick={()=>makeReport().catch(e=>alert(e.message))}>📊 Generate PowerPoint</button></div><button className="btn" onClick={()=>sb.auth.signOut()}>Sign out</button></>};
 const T=[['today','☀️','Today'],['faith','✝️','Faith'],['class','📚','Class'],['social','🤝','Social'],['week','📅','Week'],['more','⚙️','More']];
 return <><main>{views[tab]()}</main><nav>{T.map(([k,i,l])=><button key={k} className={tab===k?'on':''} onClick={()=>{setTab(k);scrollTo(0,0)}}><span>{i}</span>{l}</button>)}</nav></>;
}
