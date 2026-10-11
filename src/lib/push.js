import {sb} from './supabase.js';
const b64=s=>{const p='='.repeat((4-s.length%4)%4),r=atob((s+p).replace(/-/g,'+').replace(/_/g,'/'));return Uint8Array.from([...r].map(c=>c.charCodeAt(0)))};
export async function enablePush(uid){
 const key=import.meta.env.VITE_VAPID_PUBLIC_KEY;if(!key)throw new Error('VITE_VAPID_PUBLIC_KEY is not set.');
 if(!('serviceWorker' in navigator)||!('PushManager' in window))throw new Error('This browser does not support push. On iPhone, install the app to the Home Screen first.');
 if(await Notification.requestPermission()!=='granted')throw new Error('Notifications are blocked in your browser settings.');
 const reg=await navigator.serviceWorker.ready;const sub=await reg.pushManager.subscribe({userVisibleOnly:true,applicationServerKey:b64(key)});const j=sub.toJSON();
 const {error}=await sb.from('push_subs').upsert({endpoint:j.endpoint,user_id:uid,p256dh:j.keys.p256dh,auth:j.keys.auth});if(error)throw error}
