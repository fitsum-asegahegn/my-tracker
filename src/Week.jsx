import {useEffect,useState,useCallback} from 'react';
import {sb} from './lib/supabase.js';import {useKV} from './lib/kv.js';import {useRealtime} from './lib/realtime.js';import {PILLARS,PER,td} from './lib/logic.js';
const DN=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],JD=[1,2,3,4,5,6,0];
const mn=t=>{const m=/^(\d{1,2}):(\d{2})$/.exec((t||'').trim());return m?+m[1]*60+ +m[2]:null};
const rng=t=>{const [a,b]=(t||'').split(/[–—-]/);const s=mn(a),e=mn(b);return s!=null&&e!=null&&e>s?[s,e]:null};
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
 const max=Math.max(1,...exp,...cum.slice(0,idx+1))*1.12,X=i=>14+i*(292/6),Y=v=>132-v/max*118;
 const act=cum.slice(0,idx+1).map((v,i)=>[X(i),Y(v)]),pl=exp.map((v,i)=>[X(i),Y(v)]);
 const ratio=exp[idx]?cum[idx]/exp[idx]:1,st=ratio>=.9?['On track','var(--social)']:ratio>=.6?['Slightly behind','var(--faith)']:['Behind','var(--bad)'];
 const last=act[act.length-1];
 return <><h2>This week's progress</h2><div className="card"><div style={{display:'flex',justifyContent:'space-between',alignItems:'center'}}><span className="mu">Check-ins vs your plan</span><span className="tag" style={{color:st[1]}}>{st[0]}</span></div>
 <svg viewBox="0 0 320 150" style={{width:'100%',marginTop:8}} role="img" aria-label={`Progress this week: ${st[0]}`}><defs><linearGradient id="cf" x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor="#F5A04A" stopOpacity=".5"/><stop offset="1" stopColor="#F5A04A" stopOpacity="0"/></linearGradient><filter id="gl"><feGaussianBlur stdDeviation="3"/></filter></defs>
  <path d={smooth(pl)} fill="none" stroke="#9A9CB8" strokeWidth="1.5" strokeDasharray="4 4"/>
  {act.length>1&&<><path d={smooth(act)+` L${last[0]},134 L${act[0][0]},134 Z`} fill="url(#cf)"/><path d={smooth(act)} fill="none" stroke="#F5A04A" strokeWidth="2.5" strokeLinecap="round"/></>}
  <circle cx={last[0]} cy={last[1]} r="7" fill="#F5A04A" filter="url(#gl)"/><circle cx={last[0]} cy={last[1]} r="3.5" fill="#fff"/>
  {DN.map((d,i)=><text key={d} x={X(i)} y="148" textAnchor="middle" fontSize="8" fill={i===idx?'#EEEAF6':'#9A9CB8'}>{d}</text>)}</svg>
 <div className="mu">Solid orange: what you did. Dashed: where you planned to be.</div></div></>}

export function WeekPlanner({uid}){
 const kv=useKV(uid),blocks=kv.get('blocks',[]),[ss,setSs]=useState([]);
 const load=useCallback(()=>sb.from('sessions').select('*').then(({data})=>setSs(data||[])),[]);useEffect(()=>{load()},[load]);useRealtime(['sessions'],load);
 const wk=weekDates(),ti=wk.indexOf(td()),[sel,setSel]=useState(Math.max(ti,0)),[f,setF]=useState({title:'',start:'19:00',end:'20:00',pillar:'class'}),jd=JD[sel];
 const items=[...ss.filter(s=>s.day===jd).map(s=>({id:'s'+s.id,t:s.name,r:rng(s.time),p:s.track==='Faith'?'faith':'class',note:s.room})),
  ...blocks.filter(b=>b.day===jd).map(b=>({id:b.id,t:b.title,r:mn(b.start)!=null&&mn(b.end)>mn(b.start)?[mn(b.start),mn(b.end)]:null,p:b.pillar,custom:true}))].filter(x=>x.r).sort((a,b)=>a.r[0]-b.r[0]);
 const cols=[];items.forEach(it=>{let c=cols.findIndex(e=>e<=it.r[0]);if(c<0){c=cols.length;cols.push(0)}cols[c]=it.r[1];it.c=c});
 const nc=Math.max(1,cols.length),H0=6,H1=23,PX=44,now=new Date(),nm=now.getHours()*60+now.getMinutes();
 const add=()=>{if(!f.title.trim()||!(mn(f.end)>mn(f.start)))return alert('Add a title and make the end time later than the start.');kv.set('blocks',[...blocks,{id:crypto.randomUUID(),day:jd,...f,title:f.title.trim()}]);setF({...f,title:''})};
 return <><h1>Week</h1>
 <div className="strip">{wk.map((d,i)=><button key={d} className={(i===sel?'on ':'')+(i===ti?'today':'')} onClick={()=>setSel(i)}><small>{DN[i]}</small><b>{+d.slice(8)}</b></button>)}</div>
 <div className="tl" style={{height:(H1-H0)*PX}}>{Array.from({length:H1-H0+1},(_,i)=><div className="hr" key={i} style={{top:i*PX}}><span>{String(H0+i).padStart(2,'0')}:00</span></div>)}
  {sel===ti&&nm>=H0*60&&nm<=H1*60&&<div className="nowl" style={{top:(nm/60-H0)*PX}}/>}
  {items.map(it=>{const top=Math.max(0,(it.r[0]/60-H0)*PX),h=Math.max(26,(it.r[1]-it.r[0])/60*PX-2);return <div key={it.id} className="blk" onClick={()=>it.custom&&confirm(`Remove "${it.t}"?`)&&kv.set('blocks',blocks.filter(b=>b.id!==it.id))}
   style={{top,height:h,left:`calc(46px + (100% - 46px) * ${it.c/nc})`,width:`calc((100% - 46px) / ${nc} - 4px)`,borderColor:PILLARS[it.p].c,background:PILLARS[it.p].c+'26'}}>
   <b>{it.t}</b><small>{String(Math.floor(it.r[0]/60)).padStart(2,'0')}:{String(it.r[0]%60).padStart(2,'0')}–{String(Math.floor(it.r[1]/60)).padStart(2,'0')}:{String(it.r[1]%60).padStart(2,'0')}{it.note?' · '+it.note:''}</small></div>})}
  {!items.length&&<div className="mu" style={{position:'absolute',left:60,top:20}}>Nothing planned. Add a block below.</div>}</div>
 <div className="card" style={{marginTop:12}}><label>Add a block to {DN[sel]}</label><input placeholder="e.g. Python practice" value={f.title} onChange={e=>setF({...f,title:e.target.value})}/>
 <div className="form3"><input type="time" value={f.start} onChange={e=>setF({...f,start:e.target.value})}/><input type="time" value={f.end} onChange={e=>setF({...f,end:e.target.value})}/>
 <select value={f.pillar} onChange={e=>setF({...f,pillar:e.target.value})}>{Object.entries(PILLARS).map(([k,v])=><option key={k} value={k}>{v.e}</option>)}</select></div>
 <button className="btn pri" onClick={add}>Add block</button><p className="mu">Classes from your timetable show here automatically. Tap one of your own blocks to remove it.</p></div></>}
