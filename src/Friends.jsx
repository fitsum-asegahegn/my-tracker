import {useEffect,useState,useCallback} from 'react';import {sb} from './lib/supabase.js';import {useRealtime} from './lib/realtime.js';import {td,dd} from './lib/logic.js';
export default function Friends({uid}){const [fs,setFs]=useState([]),[n,setN]=useState(''),[ev,setEv]=useState(14);
 const load=useCallback(()=>sb.from('friends').select('*').then(({data})=>setFs(data||[])),[]);useEffect(()=>{load()},[load]);useRealtime(['friends'],load);
 const gap=f=>dd(f.last||f.created,td()),late=f=>gap(f)>=f.every;
 const add=async()=>{if(!n.trim())return;await sb.from('friends').insert({user_id:uid,name:n.trim(),every:+ev||14});setN('');load()};
 const touch=async f=>{setFs(x=>x.map(y=>y.id===f.id?{...y,last:td()}:y));await sb.from('friends').update({last:td()}).eq('id',f.id)};
 const sorted=[...fs].sort((a,b)=>(late(b)-late(a))||(gap(b)/b.every-gap(a)/a.every));
 return <><h2>Friends</h2><div className="card">{sorted.map(f=><div className={'row '+(late(f)?'over':'')} key={f.id}><div className="t">{f.name}<small>every {f.every} days · {f.last?gap(f)+' days ago':'not logged yet'}</small></div><button className="btn sm" onClick={()=>touch(f)}>Connected</button><button className="btn sm" aria-label="remove" onClick={async()=>{await sb.from('friends').delete().eq('id',f.id);load()}}>✕</button></div>)||null}
 {!fs.length&&<span className="mu">No friends yet. Add your closest five first.</span>}
 <div className="form3" style={{marginTop:10}}><input placeholder="Name" value={n} onChange={e=>setN(e.target.value)}/><input type="number" min="1" value={ev} onChange={e=>setEv(e.target.value)} aria-label="every N days"/><button className="btn pri" onClick={add}>Add</button></div></div></>}
