import {useEffect,useState,useCallback} from 'react';import {sb} from './lib/supabase.js';import {useRealtime} from './lib/realtime.js';
export default function Nudges(){const [ns,setNs]=useState([]);
 const load=useCallback(()=>sb.from('nudges').select('*').eq('read',false).order('created',{ascending:false}).then(({data})=>setNs(data||[])),[]);
 useEffect(()=>{load()},[load]);useRealtime(['nudges'],load);
 if(!ns.length)return null;
 return <div className="card" style={{borderColor:'var(--faith)'}}>{ns.map(n=><div className="row" key={n.id}><div className="t">🤍 {n.from_name}<small style={{color:'var(--tx)'}}>{n.message}</small></div>
  <button className="btn sm" onClick={async()=>{setNs(x=>x.filter(y=>y.id!==n.id));await sb.from('nudges').update({read:true}).eq('id',n.id)}}>Thanks</button></div>)}</div>}
