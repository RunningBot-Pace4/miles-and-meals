const CACHE_NAME = "miles-meals-static-v92-24";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/miles-meals-icon.svg",
  "/miles-meals-icon-192.png",
  "/miles-meals-icon-512.png",
  "/apple-touch-icon.png",
  "/icons/v92/icon-192.png",
  "/icons/v92/icon-512.png",
  "/icons/v92/icon-maskable-192.png",
  "/icons/v92/icon-maskable-512.png",
  "/icons/v92/notification-icon-96.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      // An existing app stays on one coherent version until the user accepts
      // the update. PwaRegister then sends SKIP_WAITING and reloads once.
      .then(() => undefined),
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    Promise.all([
      caches
        .keys()
        .then((keys) =>
          Promise.all(
            keys
              .filter((key) => key !== CACHE_NAME)
              .map((key) => caches.delete(key)),
          ),
        ),
      self.registration.navigationPreload
        ? self.registration.navigationPreload.enable()
        : Promise.resolve(),
    ]).then(() => self.clients.claim()),
  );
});

self.addEventListener("message", (event) => {
  if (event.data?.type === "SKIP_WAITING") {
    event.waitUntil(self.skipWaiting());
  }
});

async function getOfflineShell() {
  const cache = await caches.open(CACHE_NAME);
  const cached = await cache.match(OFFLINE_URL);

  if (cached) {
    return cached;
  }

  return new Response(
    "Miles & Meals is offline. Reconnect and try again.",
    {
      status: 503,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
      },
    },
  );
}

async function handleNavigation(event) {
  try {
    const preloaded = await event.preloadResponse;

    if (preloaded) {
      return preloaded;
    }

    return await fetch(event.request);
  } catch {
    return getOfflineShell();
  }
}

async function handleStaticAsset(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      await cache.put(request, response.clone());
    }

    return response;
  } catch {
    return new Response("", { status: 504 });
  }
}

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (
    request.method !== "GET" ||
    new URL(request.url).origin !== self.location.origin
  ) {
    return;
  }

  const url = new URL(request.url);

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(event));
    return;
  }

  const staticRequest =
    PRECACHE_ASSETS.includes(url.pathname) ||
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/tesseract/");

  if (staticRequest) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Authenticated app/API requests remain network-only by design.
  event.respondWith(fetch(request));
});

function parsePushPayload(event) {
  if (!event.data) {
    return {
      title: "Miles & Meals",
      body: "Your trip has a new update.",
      url: "/dashboard",
      tag: "miles-meals",
    };
  }

  try {
    return event.data.json();
  } catch {
    return {
      title: "Miles & Meals",
      body: event.data.text(),
      url: "/dashboard",
      tag: "miles-meals",
    };
  }
}

async function setBadge() {
  if (
    "setAppBadge" in self.navigator &&
    typeof self.navigator.setAppBadge === "function"
  ) {
    try {
      await self.navigator.setAppBadge(1);
    } catch {
      // Badge support varies by browser/platform.
    }
  }
}

async function clearBadge() {
  if (
    "clearAppBadge" in self.navigator &&
    typeof self.navigator.clearAppBadge === "function"
  ) {
    try {
      await self.navigator.clearAppBadge();
    } catch {
      // Badge support varies by browser/platform.
    }
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event);

  event.waitUntil(
    Promise.all([
      self.registration.showNotification(
        payload.title || "Miles & Meals",
        {
          body:
            payload.body ||
            "Your trip has a new update.",
          icon: "/icons/v92/icon-192.png",
          badge: "/icons/v92/notification-icon-96.png",
          tag:
            payload.tag ||
            "miles-meals-update",
          data: {
            url:
              payload.url ||
              "/dashboard",
          },
        },
      ),
      setBadge(),
    ]),
  );
});

self.addEventListener(
  "notificationclick",
  (event) => {
    event.notification.close();

    const destination =
      event.notification.data?.url ||
      "/dashboard";

    event.waitUntil(
      Promise.all([
        clearBadge(),
        self.clients
          .matchAll({
            type: "window",
            includeUncontrolled: true,
          })
          .then(async (clients) => {
            const absoluteUrl = new URL(
              destination,
              self.location.origin,
            ).href;

            for (const client of clients) {
              if (
                "focus" in client &&
                client.url.startsWith(
                  self.location.origin,
                )
              ) {
                await client.focus();

                if ("navigate" in client) {
                  await client.navigate(
                    absoluteUrl,
                  );
                }

                return;
              }
            }

            if (self.clients.openWindow) {
              await self.clients.openWindow(
                absoluteUrl,
              );
            }
          }),
      ]),
    );
  },
);
