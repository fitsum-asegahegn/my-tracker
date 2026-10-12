import {PILLARS,td,score,streak} from './lib/logic.js';
const back=n=>{const d=new Date();d.setDate(d.getDate()-n);return td(d)};
const sm=p=>p.map((q,i)=>i?`C${(p[i-1][0]+q[0])/2},${p[i-1][1]} ${(p[i-1][0]+q[0])/2},${q[1]} ${q[0]},${q[1]}`:`M${q[0]},${q[1]}`).join(' ');
export function Rings({hs,start}){const r=[15.9,11.4,6.9];
 return <svg viewBox="0 0 36 36">{Object.entries(PILLARS).map(([k,v],i)=><g key={k}><circle cx="18" cy="18" r={r[i]} fill="none" stroke="#252a47" strokeWidth="2.6"/>
 <circle className="v" cx="18" cy="18" r={r[i]} fill="none" stroke={v.c} strokeWidth="2.6" strokeLinecap="round" pathLength="100" strokeDasharray={`${Math.max(score(hs,k,start),1)} 100`} transform="rotate(-90 18 18)"/></g>)}</svg>}
export default function Charts({hs}){
 const days=Array.from({length:30},(_,i)=>back(29-i)),P=['faith','class','social'];
 const by={};hs.forEach(h=>h.logs.forEach(d=>{(by[d]=by[d]||{faith:0,class:0,social:0})[h.pillar]++}));
 const per=days.map(d=>by[d]||{faith:0,class:0,social:0}),tot=per.map(o=>o.faith+o.class+o.social),sum=tot.reduce((a,b)=>a+b,0),mx=Math.max(4,...tot),any=tot.map(x=>x>0);
 let cur=0;for(let i=any[29]?29:28;i>=0&&any[i];i--)cur++;let best=0,run=0;any.forEach(a=>{run=a?run+1:0;best=Math.max(best,run)});
 const ma=tot.map((_,i)=>{const w=tot.slice(Math.max(0,i-6),i+1);return w.reduce((a,b)=>a+b,0)/w.length});
 const X=i=>30+i*9.5,Y=v=>104-v/mx*92,ticks=[0,Math.round(mx/2),mx];
 const dow=(new Date().getDay()+6)%7,cells=[];for(let w=0;w<5;w++)for(let r=0;r<7;r++){const n=-(6-dow)+34-(w*7+r),d=back(n),o=by[d],t=o?o.faith+o.class+o.social:0;
  const dom=o?P.reduce((a,k)=>o[k]>o[a]?k:a,'faith'):null;cells.push({d,t,dom,future:n<0})}
 const daily=hs.filter(h=>h.freq==='d');
 return <><h2>Last 30 days</h2>
 <div className="card"><div className="grid3"><div><b>{cur}</b><span className="mu">day streak</span></div><div><b>{best}</b><span className="mu">best run</span></div><div><b>{(sum/30).toFixed(1)}</b><span className="mu">avg / day</span></div></div>
 <svg viewBox="0 0 320 126" style={{width:'100%',marginTop:12}} role="img" aria-label="Habits ticked per day with 7-day trend">
  <defs>{P.map(k=><linearGradient key={k} id={'bg'+k} x1="0" x2="0" y1="0" y2="1"><stop offset="0" stopColor={PILLARS[k].c}/><stop offset="1" stopColor={PILLARS[k].c} stopOpacity=".55"/></linearGradient>)}<filter id="tg"><feGaussianBlur stdDeviation="2.5"/></filter></defs>
  {ticks.map(t=><g key={t}><line x1="26" x2="318" y1={Y(t)} y2={Y(t)} stroke="#2B3050" strokeDasharray={t?'2 3':''}/><text x="20" y={Y(t)+3} textAnchor="end" fontSize="8" fill="#9A9CB8">{t}</text></g>)}
  <rect x={X(29)-6} y="8" width="12" height="96" rx="4" fill="#ffffff" opacity=".05"/>
  {per.map((o,i)=>{let y=104;return P.map(k=>{const h=o[k]/mx*92;y-=h;return h>0&&<rect key={i+k} className="grow" style={{animationDelay:i*18+'ms'}} x={X(i)-3.5} y={y} width="7" height={h} rx="2" fill={`url(#bg${k})`}/>})})}
  {sum>0&&<><path d={sm(ma.map((v,i)=>[X(i),Y(v)]))} fill="none" stroke="#F5A04A" strokeWidth="5" opacity=".35" filter="url(#tg)"/><path className="draw" pathLength="1" d={sm(ma.map((v,i)=>[X(i),Y(v)]))} fill="none" stroke="#F5A04A" strokeWidth="2" strokeLinecap="round"/></>}
  {[0,7,14,21,29].map(i=><text key={i} x={X(i)} y="120" textAnchor="middle" fontSize="8" fill="#9A9CB8">{days[i].slice(5)}</text>)}
  {sum===0&&<text x="170" y="62" textAnchor="middle" fontSize="10" fill="#9A9CB8">Tick your first habit to start your trend</text>}</svg>
 <div className="mu">Bars: habits ticked per day (gold faith, blue class, green social). Orange line: 7-day average.</div></div>
 <div className="card"><div className="mu" style={{marginBottom:8}}>Consistency map · 5 weeks</div><div style={{display:'flex',gap:8}}><div className="calab">{['M','T','W','T','F','S','S'].map((d,i)=><span key={i}>{d}</span>)}</div>
  <div className="cal">{cells.map(c=><i key={c.d} title={`${c.d}: ${c.t}`} style={c.t?{background:PILLARS[c.dom].c,opacity:.25+.75*Math.min(1,c.t/mx)}:{opacity:c.future?.35:1}}/>)}</div></div></div>
 {daily.length>0&&<div className="card">{daily.map(h=><div key={h.id||h.name} style={{marginBottom:10}}><div className="mu">{h.name} · {streak(h)}-day streak · {h.logs.filter(d=>days.includes(d)).length}/30</div>
  <div className="heat">{days.map(d=><i key={d} title={d} style={h.logs.includes(d)?{background:PILLARS[h.pillar].c}:{}}/>)}</div></div>)}</div>}</>}
