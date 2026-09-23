var CACHE='rhythmos-v2',FLAG='r-flag',PENDING='r-pending',LASTGOOD='r-last-good',GOOD='r-good',FORCE=null;
var CORE=['./','./index.html','./manifest.webmanifest','./icon.svg'];

function readForce(){
  return caches.open(FLAG).then(function(c){
    return c.match('force').then(function(r){
      FORCE=r?'1':null;
      return FORCE;
    });
  });
}

function writeForce(on){
  FORCE=on?'1':null;
  return caches.open(FLAG).then(function(c){
    return on?c.put('force',new Response('1')):c.delete('force');
  });
}

function goodText(key,path,mime){
  return fetch(path+'?v='+Date.now(),{cache:'no-store'}).then(function(fr){
    if(!fr.ok)throw 0;
    return fr.text();
  }).then(function(t){
    var nr=new Response(t,{headers:{'Content-Type':mime}});
    caches.open(GOOD).then(function(c){c.put(key,nr.clone());});
    return nr;
  }).catch(function(){
    return caches.open(GOOD).then(function(c){
      return c.match(key);
    }).then(function(r){
      if(r) return r;
      return caches.open(LASTGOOD).then(function(lc){
        return lc.match('index.html');
      });
    }).then(function(r){
      if(r) return r;
      /* FIX: fallback στο κανονικό cache */
      return caches.open(CACHE).then(function(cc){
        return cc.match('./index.html');
      });
    }).then(function(r){
      /* FIX: ΠΑΝΤΑ επιστρέφουμε έγκυρο Response */
      return r || new Response(
        '<!doctype html><html><head><meta charset="UTF-8"></head>'
        +'<body style="font-family:system-ui;padding:2em;background:#1e1e2e;color:#fff">'
        +'<h2>Δεν βρέθηκε αποθηκευμένη έκδοση backup.</h2>'
        +'<p>Το αρχείο <code>good/index.html.txt</code> δεν υπάρχει στον server και δεν υπάρχει cached αντίγραφο.</p>'
        +'<button onclick="if(navigator.serviceWorker&&navigator.serviceWorker.controller){navigator.serviceWorker.controller.postMessage({type:\'set-force\',on:false});}setTimeout(function(){location.reload()},300)"'
        +' style="padding:12px 24px;border:none;border-radius:14px;background:#6366f1;color:#fff;font-size:1rem;cursor:pointer">'
        +'Επιστροφή στη ζωντανή έκδοση</button></body></html>',
        {status:200,headers:{'Content-Type':'text/html; charset=utf-8'}}
      );
    });
  });
}

self.addEventListener('install',function(e){
  e.waitUntil(
    caches.open(CACHE).then(function(c){
      return Promise.all(CORE.map(function(u){
        return c.add(u).catch(function(){});
      }));
    })
  );
  self.skipWaiting();
});

self.addEventListener('activate',function(e){
  e.waitUntil(
    caches.keys().then(function(ks){
      return Promise.all(
        ks.filter(function(k){
          return [CACHE,FLAG,PENDING,LASTGOOD,GOOD].indexOf(k)===-1;
        }).map(function(k){return caches.delete(k);})
      );
    }).then(function(){return self.clients.claim();})
  );
});

self.addEventListener('message',function(e){
  var d=e.data||{};
  if(d.type==='set-force'){
    /* FIX: επιβεβαίωση ΜΟΝΟ ΑΦΟΥ ολοκληρωθεί η εγγραφή */
    writeForce(d.on).then(function(){
      if(e.source) e.source.postMessage({type:'force-written',on:!!d.on});
    });
  }
  else if(d.type==='clear-force'){writeForce(false);}
  else if(d.type==='get-force'){
    /* FIX: readForce πρώτα, μετά απάντηση */
    readForce().then(function(){
      if(e.source) e.source.postMessage({type:'force-state',on:FORCE==='1'});
    });
  }
  else if(d.type==='mark-good'){
    if(FORCE==='1')return;
    caches.open(PENDING).then(function(pc){
      return pc.match('index.html').then(function(r){
        if(!r)return null;
        return caches.open(LASTGOOD).then(function(lc){
          return lc.put('index.html',r);
        });
      });
    });
  }
});

self.addEventListener('fetch',function(e){
  var url=new URL(e.request.url);

  if(url.searchParams.has('vcheck')){
    e.respondWith(fetch(e.request,{cache:'no-store'}));
    return;
  }

  var isNav=e.request.mode==='navigate';
  var isIndex=isNav&&(url.pathname==='/'||/\/(index\.html)?$/.test(url.pathname));
  var isManifest=url.pathname.indexOf('manifest.webmanifest')>-1;

  if(isManifest){
    e.respondWith(readForce().then(function(f){
      if(f==='1') return goodText('manifest','good/manifest.webmanifest.txt','application/manifest+json');
      return fetch(e.request);
    }));
    return;
  }

  if(isIndex){
    e.respondWith(readForce().then(function(f){
      if(f==='1'){
        return goodText('index','good/index.html.txt','text/html; charset=utf-8');
      }
      return fetch(e.request).then(function(res){
        if(res.ok){
          var cp=res.clone();
          caches.open(PENDING).then(function(c){c.put('index.html',cp);});
        }
        return res;
      }).catch(function(){
        return caches.match(e.request).then(function(r){
          if(r) return r;
          return caches.open(LASTGOOD).then(function(c){
            return c.match('index.html');
          });
        }).then(function(r){
          return r||new Response('Εκτός δικτύου και χωρίς αποθηκευμένη έκδοση.',
            {status:503,headers:{'Content-Type':'text/plain; charset=utf-8'}});
        });
      });
    }));
    return;
  }

  e.respondWith(
    fetch(e.request).then(function(res){
      if(res.ok||res.type==='opaque'){
        var cp=res.clone();
        caches.open(CACHE).then(function(c){c.put(e.request,cp);});
      }
      return res;
    }).catch(function(){
      return caches.match(e.request).then(function(r){
        return r||Response.error();
      });
    })
  );
});
