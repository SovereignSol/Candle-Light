// Minimal service worker: no fetch caching by default (avoids stale JS/auth issues).
self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (event) => event.waitUntil(self.clients.claim()));

self.addEventListener("push", (event) => {
  let payload = {};
  try {
    payload = event.data ? event.data.json() : {};
  } catch {
    payload = { body: event.data ? event.data.text() : "New update" };
  }

  const title = payload.title || "Lightwell Rewards";
  const options = {
    body: payload.body || "You have a new notification.",
    icon: payload.icon || "./icons/tab_purchase.webp",
    badge: payload.badge || "./icons/tab_purchase.webp",
    data: {
      url: payload.url || "./pages/rewards.html"
    }
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const targetUrl = event.notification?.data?.url || "./pages/rewards.html";

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clients) => {
      for (const client of clients) {
        if ("focus" in client) {
          client.navigate(targetUrl);
          return client.focus();
        }
      }
      return self.clients.openWindow(targetUrl);
    })
  );
});
