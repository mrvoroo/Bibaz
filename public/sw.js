/* Bibaz admin service worker: installable app + web-push order notifications. */
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) => e.waitUntil(self.clients.claim()));

// Minimal fetch handler so the app is installable; network-first, no caching of data.
self.addEventListener("fetch", () => {});

self.addEventListener("push", (event) => {
  let d = {};
  try { d = event.data ? event.data.json() : {}; } catch { d = { title: "طلب جديد", body: event.data ? event.data.text() : "" }; }
  const title = d.title || "طلب جديد - بيباز";
  event.waitUntil(
    self.registration.showNotification(title, {
      body: d.body || "وصلك طلب جديد",
      icon: "icons/icon-192.png",
      badge: "icons/icon-192.png",
      tag: d.tag || "order",
      dir: "rtl",
      lang: "ar",
      vibrate: [200, 100, 200],
      data: { url: d.url || "./" },
    }),
  );
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const url = new URL((event.notification.data && event.notification.data.url) || "./", self.registration.scope).href;
  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((list) => {
      for (const c of list) if (c.url.startsWith(self.registration.scope) && "focus" in c) return c.focus();
      return self.clients.openWindow(url);
    }),
  );
});
