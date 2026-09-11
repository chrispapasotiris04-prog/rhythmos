self.addEventListener('install',function(e){self.skipWaiting();});
self.addEventListener('activate',function(e){e.waitUntil(self.clients.claim());});
self.addEventListener('fetch',function(e){e.respondWith(fetch(e.request).then(function(res){var cp=res.clone();caches.open('rhythmos-v1').then(function(c){c.put(e.request,cp);});return res;}).catch(function(){return caches.match(e.request);}));});
