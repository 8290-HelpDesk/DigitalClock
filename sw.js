// Bump CACHE_VERSION whenever you edit index.html or manifest.json.
// The kiosk will pick up the new version on its next reload.
var CACHE_VERSION = "clock-v2";

var ASSETS = [
  "./",
  "./index.html",
  "./manifest.json",
  "./icon-192.png",
  "./icon-512.png"
];

self.addEventListener("install", function (e) {
  self.skipWaiting();
  e.waitUntil(
    caches.open(CACHE_VERSION).then(function (c) {
      // addAll fails the whole install if any single file 404s, so add
      // individually and tolerate a missing icon.
      return Promise.all(ASSETS.map(function (url) {
        return c.add(url).catch(function () {});
      }));
    })
  );
});

self.addEventListener("activate", function (e) {
  e.waitUntil(
    caches.keys().then(function (keys) {
      return Promise.all(keys.map(function (k) {
        return k === CACHE_VERSION ? null : caches.delete(k);
      }));
    }).then(function () { return self.clients.claim(); })
  );
});

// Cache-first: the display never waits on the network, and a dead link or
// dropped Wi-Fi can't blank the screen. A background fetch quietly refreshes
// the copy so the next reload picks up any edits.
self.addEventListener("fetch", function (e) {
  if (e.request.method !== "GET") return;

  e.respondWith(
    caches.match(e.request).then(function (hit) {
      var live = fetch(e.request).then(function (res) {
        if (res && res.status === 200 && res.type === "basic") {
          var copy = res.clone();
          caches.open(CACHE_VERSION).then(function (c) { c.put(e.request, copy); });
        }
        return res;
      }).catch(function () { return hit; });

      return hit || live;
    })
  );
});
