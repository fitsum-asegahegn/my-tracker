import {useEffect,useState,useCallback} from 'react';
import {sb} from './lib/supabase.js';import {useKV} from './lib/kv.js';import {useRealtime} from './lib/realtime.js';import {PILLARS,PER,td} from './lib/logic.js';
const DN=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],JD=[1,2,3,4,5,6,0];
const mn=t=>{const m=/^(\d{1,2}):(\d{2})$/.exec((t||'').trim());return m?+m[1]*60+ +m[2]:null};
const rng=t=>{const m=(t||'').match(/\d{1,2}:\d{2}/g);if(!m||m.length<2)return null;const a=mn(m[0]),e=mn(m[1]);return e>a?[a,e]:null};
const useWide=()=>{const q='(min-width:820px)',has=typeof matchMedia!=='undefined';const [w,setW]=useState(()=>has&&matchMedia(q).matches);useEffect(()=>{if(!has)return;const m=matchMedia(q),f=()=>setW(m.matches);m.addEventListener('change',f);return()=>m.removeEventListener('change',f)},[]);return w};
const weekDates=()=>{const n=new Date(),k=(n.getDay()+6)%7,o=[];for(let i=0;i<7;i++){const d=new Date(n);d.setDate(n.getDate()-k+i);o.push(td(d))}return o};
const smooth=p=>p.map((q,i)=>i?`C${(p[i-1][0]+q[0])/2},${p[i-1][1]} ${(p[i-1][0]+q[0])/2},${q[1]} ${q[0]},${q[1]}`:`M${q[0]},${q[1]}`).join(' ');

export function Gauge({uid}){const kv=useKV(uid),log=kv.get('studylog',{}),tgt=kv.get('target',10);
 const wk=weekDates(),idx=Math.max(wk.indexOf(td()),0),h=wk.reduce((a,d)=>a+(log[d]||0),0),p=Math.min(1,h/tgt),pace=tgt*(idx+1)/7,diff=+(h-pace).toFixed(1);
 return <div className="card"><div style={{display:'flex',alignItems:'center',gap:14}}>
 <svg viewBox="0 0 120 72" style={{width:150,flex:'none'}} role="img" aria-label={`Study hours this week: ${h} of ${tgt}`}><defs><linearGradient id="gg" x1="0" x2="1" y1="0" y2="0"><stop offset="0" stopColor="#7AA2FF"/><stop offset="1" stopColor="#6FD6A8"/></linearGradient></defs>
  <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="#252a47" strokeWidth="9" strokeLinecap="round"/>
  <path d="M10 62 A50 50 0 0 1 110 62" fill="none" stroke="url(#gg)" strokeWidth="9" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(p*100,.5)} 100`} style={{transition:'stroke-dasharray .9s cubic-bezier(.2,.8,.2,1)'}}/>
  <text x="60" y="52" textAnchor="middle" fill="#EEEAF6" fontSize="19" fontFamily="Fraunces,serif">{h}h</text><text x="60" y="66" textAnchor="middle" fill="#9A9CB8" fontSize="7">of {tgt}h this week</text></svg>
 <div style={{flex:1}}><h3>Study this week</h3><div className="mu" style={{color:diff>=0?'var(--social)':'var(--faith)'}}>{diff>=0?`Ahead of pace by ${diff}h`:`${-diff}h behind pace`}</div>
 <div style={{marginTop:8}}><span className="mu">Weekly target </span><button className="btn sm" onClick={()=>kv.set('target',Math.max(1,tgt-1))}>−</button> <button className="btn sm" onClick={()=>kv.set('target',tgt+1)}>+</button></div></div></div></div>}

export function WeekCurve({hs}){
 const wk=weekDates(),idx=Math.max(wk.indexOf(td()),0),per=hs.reduce((a,h)=>a+1/PER[h.freq],0);
 const cum=wk.map(d=>hs.reduce((a,h)=>a+h.logs.filter(x=>x<=d&&x>=wk[0]).length,0)),exp=wk.map((_,i)=>per*(i+1));
 const max=Math.max(2,...exp.map(v=>v*1.15),...cum.slice(0,idx+1))*1.05,X=i=>34+i*(296/6),Y=v=>164-v/max*146;
 const act=cum.slice(0,idx+1).map((v,i)=>[X(i),Y(v)]),pts=a=>a.map(p=>p.join(',')).join(' L');
 const hi=exp.map((v,i)=>[X(i),Y(v*1.15)]),lo=exp.map((v,i)=>[X(i),Y(v*.85)]),band='M'+pts(hi)+' L'+pts(lo.slice().reverse())+' Z';
 const ratio=exp[idx]?cum[idx]/exp[idx]:1,st=ratio>=.9?['On track','var(--social)']:ratio>=.6?['Slightly behind','var(--faith)']:['Behind','var(--bad)'];
 const last=act[act.length-1],delta=Math.round(cum[idx]-exp[idx]),ticks=[0,.25,.5,.75,1].map(f=>Math.round(max*f));
 const pil=Object.keys(PILLARS).map(k=>{const g=hs.filter(h=>h.pillar===k);return {k,done:g.reduce((a,h)=>a+h.logs.filter(x=>x>=wk[0]&&x<=wk[6]).length,0),exp:g.reduce((a,h)=>a+7/PER[h.freq],0)}});
 return <><h2>This week's progress</h2><div className="card"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span className="mu">Check-ins vs your plan</span><span className="tag" style={{color:st[1]}}>{st[0]} · {delta>=0?'+':''}{delta}</span></div>
 <svg viewBox="0 0 340 186" style={{width:'100%',marginTop:8}} role="img" aria-label={`Progress this week: ${st[0]}`}><defs>
  <linearGradient id="cf" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#F5A04A" stopOpacity=".55"/><stop offset="1" stopColor="#F5A04A" stopOpacity="0"/></linearGradient>
  <linearGradient id="bd" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#6FD6A8" stopOpacity=".22"/><stop offset="1" stopColor="#6FD6A8" stopOpacity=".05"/></linearGradient><filter id="gl"><feGaussianBlur stdDeviation="3"/></filter></defs>
  {ticks.map(t=><g key={t}><line x1="32" x2="332" y1={Y(t)} y2={Y(t)} stroke="#2B3050" strokeDasharray={t?'2 3':''}/><text x="26" y={Y(t)+3} textAnchor="end" fontSize="8" fill="#9A9CB8">{t}</text></g>)}
  <path d={band} fill="url(#bd)"/><path d={'M'+pts(exp.map((v,i)=>[X(i),Y(v)]))} fill="none" stroke="#6FD6A8" strokeOpacity=".7" strokeWidth="1.4" strokeDasharray="4 4"/>
  {act.length>1&&<><path d={smooth(act)+` L${last[0]},${Y(0)} L${act[0][0]},${Y(0)} Z`} fill="url(#cf)"/><path d={smooth(act)} fill="none" stroke="#F5A04A" strokeWidth="6" opacity=".35" filter="url(#gl)"/><path className="draw" pathLength="1" d={smooth(act)} fill="none" stroke="#F5A04A" strokeWidth="2.6" strokeLinecap="round"/></>}
  {act.map((p,i)=>i<act.length-1&&<circle key={i} cx={p[0]} cy={p[1]} r="3" fill="#0F1220" stroke="#F5A04A" strokeWidth="1.6"/>)}
  <circle className="pulse" cx={last[0]} cy={last[1]} r="9" fill="#F5A04A" opacity=".35"/><circle cx={last[0]} cy={last[1]} r="4.5" fill="#fff" stroke="#F5A04A" strokeWidth="2"/>
  <text x={last[0]} y={last[1]-12} textAnchor="middle" fontSize="10" fontWeight="700" fill="#F5A04A">{cum[idx]}</text>
  {DN.map((d,i)=><text key={d} x={X(i)} y="180" textAnchor="middle" fontSize="9" fill={i===idx?'#EEEAF6':'#9A9CB8'}>{d}</text>)}
  {cum[idx]===0&&<text x="182" y="92" textAnchor="middle" fontSize="10" fill="#9A9CB8">Tick a habit to start your curve</text>}</svg>
 <div className="mu" style={{marginBottom:10}}>Orange: what you did. Green band: your on-track zone.</div>
 {pil.map(p=><div key={p.k} style={{marginBottom:8}}><div style={{display:'flex',justifyContent:'space-between'}}><span className="mu">{PILLARS[p.k].n} · {PILLARS[p.k].e}</span><span className="mu">{p.done} / {Math.round(p.exp)}</span></div><div className="bar"><i style={{width:Math.min(100,p.exp?p.done/p.exp*100:0)+'%',background:PILLARS[p.k].c}}/></div></div>)}</div></>}

export function WeekPlanner({uid}){
 const kv=useKV(uid),blocks=kv.get('blocks',[]),[ss,setSs]=useState([]),wide=useWide();
 const load=useCallback(()=>sb.from('sessions').select('*').then(({data})=>setSs(data||[])),[]);useEffect(()=>{load()},[load]);useRealtime(['sessions'],load);
 const wk=weekDates(),ti=wk.indexOf(td()),[sel,setSel]=useState(Math.max(ti,0)),[f,setF]=useState({title:'',start:'19:00',end:'20:00',pillar:'class',day:Math.max(ti,0)});
 const H0=6,H1=23,PX=wide?40:44,H=(H1-H0)*PX,now=new Date(),nm=now.getHours()*60+now.getMinutes(),hh=m=>String(Math.floor(m/60)).padStart(2,'0')+':'+String(m%60).padStart(2,'0');
 const build=i=>{const jd=JD[i];
  const all=[...ss.filter(s=>s.day===jd).map(s=>({id:'s'+s.id,t:s.name,time:s.time,r:rng(s.time),p:s.track==='Faith'?'faith':'class',note:s.room})),
   ...blocks.filter(b=>b.day===jd).map(b=>({id:b.id,t:b.title,r:mn(b.start)!=null&&mn(b.end)>mn(b.start)?[mn(b.start),mn(b.end)]:null,p:b.pillar,custom:true}))];
  const items=all.filter(x=>x.r).sort((a,b)=>a.r[0]-b.r[0]),cols=[];items.forEach(it=>{let c=cols.findIndex(e=>e<=it.r[0]);if(c<0){c=cols.length;cols.push(0)}cols[c]=it.r[1];it.c=c});
  return {items,bad:all.filter(x=>!x.r&&!x.custom),nc:Math.max(1,cols.length)}};
 const blks=(i,off)=>{const {items,nc}=build(i);return items.map(it=><div key={it.id} className="blk" onClick={()=>it.custom&&confirm(`Remove "${it.t}"?`)&&kv.set('blocks',blocks.filter(b=>b.id!==it.id))}
  style={{top:Math.max(0,(it.r[0]/60-H0)*PX),height:Math.max(24,(it.r[1]-it.r[0])/60*PX-2),left:`calc(${off}px + (100% - ${off}px) * ${it.c/nc})`,width:`calc((100% - ${off}px) / ${nc} - 3px)`,borderColor:PILLARS[it.p].c,background:PILLARS[it.p].c+'26'}}>
  <b>{it.t}</b><small>{hh(it.r[0])}–{hh(it.r[1])}{it.note&&!wide?' · '+it.note:''}</small></div>)};
 const nowl=(i,off)=>i===ti&&nm>=H0*60&&nm<=H1*60&&<div className="nowl" style={{top:(nm/60-H0)*PX,left:off}}/>;
 const bad=[0,1,2,3,4,5,6].flatMap(i=>build(i).bad),add=()=>{if(!f.title.trim()||!(mn(f.end)>mn(f.start)))return alert('Add a title and make the end time later than the start.');kv.set('blocks',[...blocks,{id:crypto.randomUUID(),...f,day:JD[f.day],title:f.title.trim()}]);setF({...f,title:''})};
 const hrs=Array.from({length:H1-H0+1},(_,i)=>i);
 return <><h1>Week</h1>
 {wide?<div className="wgrid"><div className="wrow wh"><span/>{wk.map((d,i)=><div key={d} className={i===ti?'today':''}><small>{DN[i]}</small><b>{+d.slice(8)}</b></div>)}</div>
  <div className="wrow"><div className="wlab" style={{height:H}}>{hrs.map(h=><span key={h} style={{top:h*PX}}>{String(H0+h).padStart(2,'0')}:00</span>)}</div>
  {wk.map((d,i)=><div key={d} className={'wcol'+(i===ti?' today':'')} style={{height:H,backgroundImage:`repeating-linear-gradient(to bottom,#232846 0,#232846 1px,transparent 1px,transparent ${PX}px)`}}>{nowl(i,0)}{blks(i,0)}</div>)}</div></div>
 :<><div className="strip">{wk.map((d,i)=><button key={d} className={(i===sel?'on ':'')+(i===ti?'today':'')} onClick={()=>{setSel(i);setF(x=>({...x,day:i}))}}><small>{DN[i]}</small><b>{+d.slice(8)}</b></button>)}</div>
  <div className="tl" style={{height:H}}>{hrs.map(h=><div className="hr" key={h} style={{top:h*PX}}><span>{String(H0+h).padStart(2,'0')}:00</span></div>)}{nowl(sel,44)}{blks(sel,46)}
  {!build(sel).items.length&&<div className="mu" style={{position:'absolute',left:60,top:PX*3}}>Nothing planned. Add a block below.</div>}</div></>}
 {bad.length>0&&<p className="mu">Couldn't place on the timeline (check the time format, e.g. 08:30–10:30): {bad.map(b=>`${b.t} (${b.time||'no time'})`).join(', ')}</p>}
 <div className="card" style={{marginTop:12}}><label>Add a block</label><input placeholder="e.g. Python practice" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
 <div className="form4"><select value={f.day} onChange={e=>setF({...f,day:+e.target.value})}>{DN.map((d,i)=><option key={d} value={i}>{d}</option>)}</select><input type="time" value={f.start} onChange={e=>setF({...f,start:e.target.value})}/><input type="time" value={f.end} onChange={e=>setF({...f,end:e.target.value})}/>
 <select value={f.pillar} onChange={e=>setF({...f,pillar:e.target.value})}>{Object.entries(PILLARS).map(([k,v])=><option key={k} value={k}>{v.e}</option>)}</select></div>
 <button className="btn pri" onClick={add}>Add block</button><p className="mu">Classes from your timetable show here automatically. Tap one of your own blocks to remove it.</p></div></>}
