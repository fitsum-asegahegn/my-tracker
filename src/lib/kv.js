import {useEffect,useState,useCallback} from 'react';import {sb} from './supabase.js';import {useRealtime} from './realtime.js';
export function useKV(uid){const [kv,setKv]=useState({});
 const load=useCallback(()=>sb.from('kv').select('key,value').then(({data})=>setKv(Object.fromEntries((data||[]).map(r=>[r.key,r.value])))),[]);
 useEffect(()=>{load()},[load]);useRealtime(['kv'],load);
 return {get:(k,d)=>kv[k]??d,set:(k,v)=>{setKv(x=>({...x,[k]:v}));sb.from('kv').upsert({user_id:uid,key:k,value:v}).then(r=>r.error&&alert(r.error.message))}}}
