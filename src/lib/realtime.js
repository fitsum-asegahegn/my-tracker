import {useEffect,useRef} from 'react';import {sb} from './supabase.js';
export function useRealtime(tables,cb){const ref=useRef(cb);ref.current=cb;
 useEffect(()=>{let t;const f=()=>{clearTimeout(t);t=setTimeout(()=>ref.current(),300)};
  const ch=sb.channel('rt-'+tables.join('-')+Math.random().toString(36).slice(2));
  tables.forEach(table=>ch.on('postgres_changes',{event:'*',schema:'public',table},f));ch.subscribe();
  return()=>{clearTimeout(t);sb.removeChannel(ch)}},[]);}
