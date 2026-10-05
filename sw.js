const CACHE='tef-reflex-core-v031';
const CORE=["./", "./index.html", "./styles.css", "./app.js", "./manifest.webmanifest", "./data/stimuli.json", "./data/trainer_config.json", "./data/audio_manifest.json"];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).then(()=>self.skipWaiting())));
self.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));
self.addEventListener('fetch',e=>{
  if(e.request.method!=='GET') return;
  e.respondWith(caches.match(e.request).then(cached=>cached||fetch(e.request).then(resp=>{
    const copy=resp.clone(); caches.open(CACHE).then(c=>c.put(e.request,copy)).catch(()=>{}); return resp;
  })));
});
