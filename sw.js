// Service Worker — force fresh code on every load
// เปลี่ยน CACHE_NAME เมื่อต้องการ force update ทุก device
const CACHE_NAME = 'lightmelt-v3';

self.addEventListener('install', function(e) {
  // activate ทันที ไม่รอ tab เก่าปิด
  self.skipWaiting();
});

self.addEventListener('activate', function(e) {
  e.waitUntil(
    // ลบ cache เก่าทั้งหมด
    caches.keys().then(function(keys) {
      return Promise.all(
        keys.filter(function(k) { return k !== CACHE_NAME; })
            .map(function(k) { return caches.delete(k); })
      );
    }).then(function() {
      // ควบคุม tab ที่เปิดอยู่ทันที
      return self.clients.claim();
    })
  );
});

self.addEventListener('fetch', function(e) {
  var url = new URL(e.request.url);
  // HTML และ root path → ดึงจาก network เสมอ ไม่ใช้ cache
  if (e.request.mode === 'navigate' ||
      url.pathname === '/' ||
      url.pathname.endsWith('.html')) {
    e.respondWith(
      fetch(e.request, { cache: 'no-store' })
        .catch(function() { return caches.match(e.request); })
    );
    return;
  }
  // ไฟล์อื่น (รูป, font) → cache แล้ว serve
  e.respondWith(
    caches.match(e.request).then(function(cached) {
      return cached || fetch(e.request).then(function(res) {
        return caches.open(CACHE_NAME).then(function(cache) {
          cache.put(e.request, res.clone());
          return res;
        });
      });
    })
  );
});
