var CACHE='rhythmos-v2',FLAG='r-flag',PENDING='r-pending',LASTGOOD='r-last-good',FORCE=null;
var CORE=['./','./index.html','./manifest.webmanifest','./icon.svg'];
function readForce(){return caches.open(FLAG).then(function(c){return c.match('force').then(function(r){FORCE=r?'1':null;return FORCE;});});}
function writeForce(on){FORCE=on?'1':null;return caches.open(FLAG).then(function(c){return on?c.put('force',new Response('1')):c.delete('force');});}
self.addEventListener('install',function(e){e.waitUntil(caches.open(CACHE).then(function(c){return Promise.all(CORE.map(function(u){return c.add(u).catch(function(){});}));}));self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(caches.keys().then(function(ks){return Promise.all(ks.filter(function(k){return [CACHE,FLAG,PENDING,LASTGOOD].indexOf(k)===-1;}).map(function(k){return caches.delete(k);}));}).then(function(){return self.clients.claim();}));});
self.addEventListener('message',function(e){var d=e.data||{};
if(d.type==='set-force'){writeForce(d.on);}
else if(d.type==='clear-force'){writeForce(false);}
else if(d.type==='get-force'){if(e.source)e.source.postMessage({type:'force-state',on:FORCE==='1'});}
else if(d.type==='mark-good'){if(FORCE==='1')return;caches.open(PENDING).then(function(pc){return pc.match('index.html').then(function(r){if(!r)return null;return caches.open(LASTGOOD).then(function(lc){return lc.put('index.html',r);});});});}});
self.addEventListener('fetch',function(e){var url=new URL(e.request.url);
if(url.searchParams.has('vcheck')){e.respondWith(fetch(e.request,{cache:'no-store'}));return;}
var isNav=e.request.mode==='navigate';var isIndex=isNav&&(url.pathname==='/'||/\/(index\.html)?$/.test(url.pathname));
if(isIndex){e.respondWith(readForce().then(function(f){
if(f==='1'){return caches.open(LASTGOOD).then(function(c){return c.match('index.html').then(function(r){if(r)return r;return fetch(e.request);});});}
return fetch(e.request).then(function(res){if(res.ok){var cp=res.clone();caches.open(PENDING).then(function(c){c.put('index.html',cp);});}return res;}).catch(function(){return caches.match(e.request).then(function(r){if(r)return r;return caches.open(LASTGOOD).then(function(c){return c.match('index.html');});}).then(function(r){return r||new Response('Εκτός δικτύου και χωρίς αποθηκευμένη έκδοση.',{status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});});});}));return;}
e.respondWith(fetch(e.request).then(function(res){if(res.ok||res.type==='opaque'){var cp=res.clone
