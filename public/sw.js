const CACHE_NAME = "miles-meals-static-v36";
const OFFLINE_URL = "/offline.html";

const PRECACHE_ASSETS = [
  OFFLINE_URL,
  "/miles-meals-icon.svg",
  "/miles-meals-icon-192.png",
  "/miles-meals-icon-512.png",
  "/apple-touch-icon.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_ASSETS))
      .then(() => self.skipWaiting()),
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
    url.pathname.startsWith("/_next/static/");

  if (staticRequest) {
    event.respondWith(handleStaticAsset(request));
    return;
  }

  // Authenticated app/API requests remain network-only by design.
  event.respondWith(fetch(request));
});
