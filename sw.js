const C='sm-serra-v5-3-0';
const A=['./','./index.html','./styles.css','./manifest.webmanifest','./js/app.js','./js/api.js','./js/config.js','./js/router.js','./js/storage.js','./js/modules/home.js','./js/modules/atendimentos.js','./js/modules/auditoria.js','./js/modules/treinamentos.js','./js/modules/dashboard.js','./js/modules/status.js','./assets/icon-192.png','./assets/icon-512.png'];
self.addEventListener('install',e=>{self.skipWaiting();e.waitUntil(caches.open(C).then(c=>c.addAll(A)))});
self.addEventListener('activate',e=>{e.waitUntil(Promise.all([self.clients.claim(),caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x))))]))});
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET')return;
  const u=new URL(e.request.url);
  if(u.origin!==location.origin)return;
  e.respondWith(fetch(e.request).then(r=>{const cp=r.clone();caches.open(C).then(x=>x.put(e.request,cp));return r}).catch(()=>caches.match(e.request).then(c=>c||caches.match('./index.html'))));
});
