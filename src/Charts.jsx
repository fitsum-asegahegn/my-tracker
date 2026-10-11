import {PILLARS,td,score,streak} from './lib/logic.js';
const back=n=>{const d=new Date();d.setDate(d.getDate()-n);return td(d)};
export function Rings({hs,start}){const r=[15.9,11.4,6.9];
 return <svg viewBox="0 0 36 36">{Object.entries(PILLARS).map(([k,v],i)=><g key={k}><circle cx="18" cy="18" r={r[i]} fill="none" stroke="#252a47" strokeWidth="2.6"/>
 <circle className="v" cx="18" cy="18" r={r[i]} fill="none" stroke={v.c} strokeWidth="2.6" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(score(hs,k,start),1)} 100`} transform="rotate(-90 18 18)"/></g>)}</svg>}
export default function Charts({hs}){
 const days=Array.from({length:30},(_,i)=>back(29-i));
 const per=days.map(d=>{const o={faith:0,class:0,social:0};hs.forEach(h=>{if(h.logs.includes(d))o[h.pillar]++});return o});
 const tot=per.map(o=>o.faith+o.class+o.social),mx=Math.max(4,...tot),any=tot.map(x=>x>0);
 let cur=0;for(let i=any[29]?29:28;i>=0&&any[i];i--)cur++;
 let best=0,run=0;any.forEach(a=>{run=a?run+1:0;best=Math.max(best,run)});
 const daily=hs.filter(h=>h.freq==='d');
 return <><h2>Last 30 days</h2>
 <div className="card"><div className="grid3"><div><b>{cur}</b><span className="mu">day streak</span></div><div><b>{best}</b><span className="mu">best run</span></div><div><b>{any.filter(Boolean).length}/30</b><span className="mu">active days</span></div></div>
 <svg viewBox="0 0 300 84" style={{width:'100%',marginTop:14}} role="img" aria-label="Habits ticked per day, last 30 days">
  {per.map((o,i)=>{let y=76;return ['faith','class','social'].map(k=>{const h=o[k]/mx*70;y-=h;return h?<rect key={i+k} x={i*10+1} y={y} width="8" height={h} rx="1.5" fill={PILLARS[k].c}/>:null})})}
  <line x1="0" y1="77" x2="300" y2="77" stroke="#2B3050"/></svg>
 <div className="mu">Habits ticked per day · gold faith, blue class, green social</div></div>
 {daily.length>0&&<div className="card">{daily.map(h=><div key={h.id||h.name} style={{marginBottom:10}}><div className="mu">{h.name} · {streak(h)}-day streak · {h.logs.filter(d=>days.includes(d)).length}/30</div>
  <div className="heat">{days.map(d=><i key={d} title={d} style={h.logs.includes(d)?{background:PILLARS[h.pillar].c}:{}}/>)}</div></div>)}</div>}</>}
