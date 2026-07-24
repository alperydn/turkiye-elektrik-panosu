// Basit servis calisani: yalnizca "app shell"i (bos sayfa yapisi) onbellege alir.
// Canli veri her zaman aginin ucundan (backend) taze cekilir; bu sadece
// tarayici/uygulama tamamen internetsizken beyaz ekran yerine bir seyler
// gorunmesini saglar.
const CACHE_ADI = "elektrik-panosu-v1";
const ONBELLEK_DOSYALARI = ["/", "/manifest.webmanifest"];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_ADI).then((cache) => cache.addAll(ONBELLEK_DOSYALARI))
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_ADI).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener("fetch", (event) => {
  // API isteklerine hic dokunma - her zaman canli veri cekilsin.
  if (event.request.url.includes("/api/")) return;

  event.respondWith(
    fetch(event.request).catch(() => caches.match(event.request))
  );
});
