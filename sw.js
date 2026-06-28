// 또복이가 온 날 — 서비스워커 (설치 가능 + 오프라인)
// HTML/매니페스트는 네트워크 우선(항상 최신 배포 반영), 해시 에셋은 캐시 우선.
const CACHE = 'wf-cache-v3';

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (e) =>
  e.waitUntil(
    (async () => {
      const keys = await caches.keys();
      await Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)));
      await self.clients.claim();
    })(),
  ),
);

self.addEventListener('fetch', (e) => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  const fresh =
    req.mode === 'navigate' ||
    url.pathname.endsWith('/') ||
    url.pathname.endsWith('.html') ||
    url.pathname.endsWith('.webmanifest');

  if (fresh) {
    // 네트워크 우선 → 실패 시 캐시
    e.respondWith(
      fetch(req)
        .then((r) => {
          const clone = r.clone();
          caches.open(CACHE).then((c) => c.put(req, clone));
          return r;
        })
        .catch(() => caches.match(req)),
    );
  } else {
    // 캐시 우선 (해시 파일은 불변)
    e.respondWith(
      caches.match(req).then(
        (cached) =>
          cached ||
          fetch(req).then((r) => {
            if (r && r.ok && url.origin === self.location.origin) {
              const clone = r.clone();
              caches.open(CACHE).then((c) => c.put(req, clone));
            }
            return r;
          }),
      ),
    );
  }
});
