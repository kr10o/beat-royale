// public/service-worker.js
const VERSION       = 'beat-royale-daw-v2';
const SAMPLE_CACHE  = `samples-${VERSION}`;

const isSamplePack = (url) => {
  return url.hostname.includes('assets.beat-battle-royale.com') && 
         url.pathname.endsWith('.zip');
};

async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const network = fetch(request.clone()).then((res) => {
      if (res && (res.ok || res.type === 'opaque')) {
        cache.put(request, res.clone());
      }
      return res;
  }).catch(() => null);
    
  return cached || (await network) || Response.error();
}

self.addEventListener('fetch', (event) => {
  const request = event.request;
  if (request.method !== 'GET') return;

  let url;
  try { url = new URL(request.url); } catch (e) { return; }

  if (isSamplePack(url)) {
    event.respondWith(staleWhileRevalidate(request, SAMPLE_CACHE));
    return;
  }
});
