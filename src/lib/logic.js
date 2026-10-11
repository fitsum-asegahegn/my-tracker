export const PER={d:1,w:7,m:30,m2:60,m6:180,y:365};
export const FREQ={d:'daily',w:'weekly',m:'monthly',m2:'every 2 months',m6:'every 6 months',y:'yearly'};
export const PILLARS={faith:{c:'#E3B04B',n:'መንፈሳዊ',e:'Faith'},class:{c:'#7AA2FF',n:'ትምህርት',e:'Class'},social:{c:'#6FD6A8',n:'ማኅበራዊ',e:'Social'}};
export const td=(d=new Date())=>`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
export const dd=(a,b)=>Math.round((new Date(b)-new Date(a))/864e5);
const EM=['','መስከረም','ጥቅምት','ኅዳር','ታኅሣሥ','ጥር','የካቲት','መጋቢት','ሚያዝያ','ግንቦት','ሰኔ','ሐምሌ','ነሐሴ','ጳጉሜን'];
export function eth(d=new Date()){const a=Math.floor((14-(d.getMonth()+1))/12),y=d.getFullYear()+4800-a,m=d.getMonth()+1+12*a-3;
 const j=d.getDate()+Math.floor((153*m+2)/5)+365*y+Math.floor(y/4)-Math.floor(y/100)+Math.floor(y/400)-32045;
 const E=k=>1724221+365*(k-1)+Math.floor(k/4);let Y=Math.floor((j-1724221)/365.25)+1;while(E(Y)>j)Y--;while(E(Y+1)<=j)Y++;
 const n=j-E(Y);return `${EM[Math.floor(n/30)+1]} ${n%30+1}, ${Y}`}
export const lastOf=h=>[...h.logs].sort().pop();
export const doneToday=h=>h.logs.includes(td());
export const isOk=(h,start)=>h.freq==='d'?doneToday(h):dd(lastOf(h)||start,td())<PER[h.freq];
export const daysLeft=(h,start)=>PER[h.freq]-dd(lastOf(h)||start,td());
export const score=(hs,p,start)=>{const x=hs.filter(h=>h.pillar===p);return x.length?Math.round(x.filter(h=>isOk(h,start)).length/x.length*100):0};
export const streak=h=>{let s=0,d=new Date();if(!h.logs.includes(td()))d.setDate(d.getDate()-1);while(h.logs.includes(td(d))){s++;d.setDate(d.getDate()-1)}return s};
