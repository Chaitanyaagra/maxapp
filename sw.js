const C='mhm-v21',R='mhm-r21';
const PRE=['./','./index.html','./manifest.json','./icon-192.png','./back-button-handler.js'];
const CDN=['cdnjs.cloudflare.com','fonts.googleapis.com','fonts.gstatic.com','www.gstatic.com'];
const SKIP=['firestore.googleapis.com','firebase.googleapis.com','identitytoolkit.googleapis.com','securetoken.googleapis.com'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(PRE)).then(()=>self.skipWaiting()).catch(()=>{}));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==C&&k!==R).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request; if(req.method!=='GET') return;
  const url=new URL(req.url);
  if(SKIP.some(h=>url.hostname.includes(h))) return;
  if(CDN.some(h=>url.hostname.includes(h))){
    e.respondWith(caches.match(req).then(h=>h||fetch(req).then(r=>{caches.open(R).then(c=>c.put(req,r.clone()));return r;}).catch(()=>new Response('',{status:503}))));
    return;
  }
  if(url.origin===self.location.origin){
    e.respondWith(fetch(req).then(r=>{caches.open(C).then(c=>c.put(req,r.clone()));return r;}).catch(()=>caches.match(req).then(h=>h||caches.match('./index.html'))));
  }
});
self.addEventListener('message',e=>{
  if(e.data?.type==='SKIP_WAITING') self.skipWaiting();
  if(e.data?.type==='CLEAR_CACHE') caches.keys().then(ks=>Promise.all(ks.map(k=>caches.delete(k))));
});
