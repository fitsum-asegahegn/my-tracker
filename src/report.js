import {sb} from './lib/supabase.js';import {PILLARS,td,dd,eth,score} from './lib/logic.js';import {HRS0,DEC0,JOB0,ROAD0} from './Class.jsx';
const load=()=>window.PptxGenJS?0:new Promise((r,j)=>{const s=document.createElement('script');s.src='https://cdn.jsdelivr.net/npm/pptxgenjs@3.12.0/dist/pptxgen.bundle.js';s.onload=r;s.onerror=()=>j(new Error('Could not load the PowerPoint library. Check your internet connection.'));document.head.appendChild(s)});
export async function makeReport(){
 await load();
 const [h,pl,kvr,fr,pr,ss]=await Promise.all([sb.from('habits').select('*,habit_logs(day)').order('sort'),sb.from('plan_items').select('*').order('sort'),sb.from('kv').select('*'),sb.from('friends').select('*'),sb.from('profiles').select('*').single(),sb.from('sessions').select('id')]);
 const hs=(h.data||[]).map(x=>({...x,logs:(x.habit_logs||[]).map(l=>l.day)})),kv=Object.fromEntries((kvr.data||[]).map(r=>[r.key,r.value]));
 const start=pr.data?.start_day||td(),cnt=x=>x.logs.filter(d=>dd(d,td())<30).length;
 const hrs=kv.hrs||HRS0,dec=kv.dec||DEC0,job=kv.job||JOB0,road=kv.road||ROAD0,sum=k=>dec[k].reduce((a,b)=>a+b,0);
 const p=new window.PptxGenJS();p.layout='LAYOUT_WIDE';const F='Nyala',BG='0F1220';
 const mk=(t,c='EEEAF6')=>{const s=p.addSlide();s.background={color:BG};s.addText(t,{x:.6,y:.35,w:12,h:.7,fontFace:F,fontSize:28,bold:true,color:c});return s};
 let s=p.addSlide();s.background={color:BG};
 s.addText('ሕይወቴ — 30-day report',{x:.8,y:2.3,w:11.5,h:1,fontFace:F,fontSize:44,bold:true,color:'E3B04B'});
 s.addText(`${pr.data?.name||''} · ${td()} · ${eth()} ዓ.ም`,{x:.8,y:3.4,w:11.5,h:.5,fontFace:F,fontSize:18,color:'9A9CB8'});
 s=mk('Overview');Object.entries(PILLARS).forEach(([k,v],i)=>{s.addText(score(hs,k,start)+'%',{x:.8+i*4.1,y:1.8,w:3.6,h:1.6,fontFace:F,fontSize:64,bold:true,color:v.c.slice(1),align:'center'});s.addText(v.n+' · '+v.e,{x:.8+i*4.1,y:3.4,w:3.6,h:.5,fontFace:F,fontSize:18,color:'EEEAF6',align:'center'})});
 const fa=hs.filter(x=>x.pillar==='faith');s=mk('መንፈሳዊ — times done in 30 days','E3B04B');
 s.addChart(p.charts.BAR,[{name:'Done',labels:fa.map(x=>x.name.split(' (')[0].slice(0,24)),values:fa.map(cnt)}],{x:.6,y:1.2,w:12,h:5.6,barDir:'bar',chartColors:['E3B04B'],catAxisLabelColor:'EEEAF6',valAxisLabelColor:'9A9CB8',catAxisLabelFontFace:F,showValue:true,dataLabelColor:'EEEAF6'});
 s=mk('ትምህርት — Class','7AA2FF');
 s.addText([`Study hours: AI ${hrs.AI}h · CDS ${hrs.CDS}h · Coding ${hrs.Code}h`,`Track scores: AI ${sum('AI')} vs CDS ${sum('CDS')} (${sum('AI')===sum('CDS')?'tied':sum('AI')>sum('CDS')?'AI leads':'CDS leads'})`,`Coding roadmap: ${road.filter(r=>r[1]).length}/${road.length} steps`,`Job search: ${job.applied} applied · ${job.interviews} interviews · ${job.offers} offers`,`Weekly sessions tracked: ${(ss.data||[]).length}`].map(t=>({text:t,options:{breakLine:true}})),{x:.8,y:1.5,w:11.5,h:4,fontFace:F,fontSize:22,color:'EEEAF6',paraSpaceAfter:14,valign:'top'});
 const f=fr.data||[],ok=f.filter(x=>dd(x.last||x.created,td())<=x.every).length;s=mk('ማኅበራዊ — Social','6FD6A8');
 s.addText(`Friends tracked: ${f.length}\nOn schedule: ${ok}\nConnections logged (30d): ${hs.filter(x=>x.pillar==='social').reduce((a,x)=>a+cnt(x),0)}`,{x:.8,y:1.5,w:11.5,h:3,fontFace:F,fontSize:24,color:'EEEAF6',valign:'top'});
 const pd=(pl.data||[]).filter(x=>x.done);s=mk('Year plan progress','E3B04B');
 s.addText(`${pd.length} of ${(pl.data||[]).length} milestones complete`,{x:.8,y:1.3,w:11.5,h:.6,fontFace:F,fontSize:24,color:'EEEAF6'});
 s.addText(pd.length?pd.slice(-8).map(x=>({text:x.title,options:{bullet:true,breakLine:true}})):'No milestones completed yet.',{x:.8,y:2.1,w:11.5,h:4.5,fontFace:F,fontSize:18,color:'C9C6DC',valign:'top'});
 await p.writeFile({fileName:`life-report-${td()}.pptx`});
}
