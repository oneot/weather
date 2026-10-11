const VERSION = "weather-v2";
const SHELL = ["./", "./offline.html", "./manifest.webmanifest", "./icons/icon-192.png", "./icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(SHELL)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;
  const url = new URL(request.url);
  // 날씨 API·Direct Line 같은 외부 요청은 항상 네트워크로 보내 최신 데이터를 유지합니다.
  if (request.method !== "GET" || url.origin !== self.location.origin) return;

  // 화면은 저장본을 즉시 보여 주고, 뒤에서 새 버전을 받아 둡니다. 오프라인에서 네트워크를 기다리지 않습니다.
  if (request.mode === "navigate") {
    event.respondWith(
      caches.open(VERSION).then(async (cache) => {
        const cached = await cache.match("./");
        const update = fetch("./").then((response) => {
          if (response.ok) cache.put("./", response.clone());
          return response;
        });
        if (cached) {
          event.waitUntil(update.catch(() => {}));
          return cached;
        }
        return update.catch(() => cache.match("./offline.html"));
      })
    );
    return;
  }

  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
