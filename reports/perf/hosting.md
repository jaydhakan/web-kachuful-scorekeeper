# Hosting: compression and cache headers

The app is served by nginx (the `play.vectanix.com` server block) behind Cloudflare. Neither config lives in this
repo; the API's own snippet is `../backend-kachuful-scorekeeper/deploy/nginx/kachuful-api.conf`. This page is what
the static part should look like, and why. Nothing here is applied yet.

## What production sends today (measured 2026-11-01)

| Path                    | Cache-Control                         | Encoding | Cloudflare               |
| ----------------------- | ------------------------------------- | -------- | ------------------------ |
| `/assets/*` (hashed)    | `public, max-age=31536000, immutable` | gzip     | cached                   |
| `/index.html`           | `no-cache`                            | brotli   |                          |
| `/sw.js`                | `max-age=14400`                       |          | cached (`EXPIRED`)       |
| `/manifest.webmanifest` | `no-cache`                            |          |                          |

Two problems:

1. **`/sw.js` is cached for 4 hours at the edge.** `max-age=14400` is Cloudflare's default Browser Cache TTL, which
   it adds when the origin sends no `Cache-Control`; Cloudflare also caches `.js` by extension. Browsers skip their
   own HTTP cache when checking for a new service worker, but they cannot skip Cloudflare's, so a deploy can take up
   to 4 hours to reach anyone, however often the app asks (it now asks on every return to the front, and hourly).
2. **Assets are gzipped, not brotli.** nginx compresses them on the fly (default `gzip_comp_level 1`) and Cloudflare
   keeps that gzip copy.

## The build now writes precompressed files

`npm run build` writes a `.br` (brotli 11) and a `.gz` (gzip 9) beside every text file over 1 KB in `dist/`
(the `precompress` plugin in `vite.config.ts`, plain `node:zlib`). The service worker's precache globs list their
extensions, so these siblings are never precached (still 40 entries). For the 28 files it compresses:

| Encoding                              | Size      |
| ------------------------------------- | --------- |
| none                                  | 781.6 KiB |
| gzip level 1 (nginx's default)        | 280.8 KiB |
| gzip level 9 (`.gz`, gzip_static)     | 249.0 KiB |
| brotli 11 (`.br`, brotli_static)      | 220.6 KiB |

The entry chunk alone: 239.5 KiB raw, 86.7 KiB gzip 1, 76.0 KiB gzip 6, 66.9 KiB brotli 11. Deploy `dist/` whole so
the siblings go up with the files they belong to.

## nginx

`brotli_static` needs the ngx_brotli module (Debian/Ubuntu: `apt install libnginx-mod-http-brotli-static`, which
loads itself from `/etc/nginx/modules-enabled`). Without it, drop the `brotli_static` line: `gzip_static` is part of
stock nginx and still serves the level 9 `.gz`.

```nginx
# Inside the play.vectanix.com server block, next to `include snippets/kachuful-api.conf;`.
root /var/www/kachuful/dist;

brotli_static on;   # serves foo.js.br when the client accepts br
gzip_static on;     # else foo.js.gz
gzip on;            # anything without a sibling (small files, API JSON)
gzip_vary on;
gzip_comp_level 5;
gzip_types text/css application/javascript application/json application/manifest+json image/svg+xml;

# add_header in a location drops every add_header inherited from the server block, so each location repeats
# the security headers it needs.

# Hashed file names: a new build always has new names, so cache forever. A missing asset must 404, never fall
# back to index.html (an old tab asking for a deleted chunk would otherwise get HTML as JavaScript).
location /assets/ {
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    add_header X-Content-Type-Options nosniff always;
    try_files $uri =404;
}

# The workbox runtime is hashed too (workbox-<hash>.js).
location ~ ^/workbox-[0-9a-f]+\.js$ {
    add_header Cache-Control "public, max-age=31536000, immutable" always;
    add_header X-Content-Type-Options nosniff always;
    try_files $uri =404;
}

# The service worker and the manifest: always revalidate, so a deploy is seen on the next check.
location = /sw.js {
    add_header Cache-Control "no-cache" always;
    add_header X-Content-Type-Options nosniff always;
    try_files $uri =404;
}
location = /manifest.webmanifest {
    types { application/manifest+json webmanifest; }
    add_header Cache-Control "no-cache" always;
    add_header X-Content-Type-Options nosniff always;
    try_files $uri =404;
}

# Unhashed icons: a day is plenty; they change only with a redesign.
location ~ ^/(icon\.svg|icon-maskable\.svg|apple-touch-icon\.png|pwa-[\w-]+\.png)$ {
    add_header Cache-Control "public, max-age=86400" always;
    add_header X-Content-Type-Options nosniff always;
    try_files $uri =404;
}

# The app shell. Any other path is the app (it has no URL routes of its own); /api/, /r/ and /l/ are matched
# first by the API snippet.
location / {
    add_header Cache-Control "no-cache" always;
    add_header X-Content-Type-Options nosniff always;
    add_header Referrer-Policy strict-origin-when-cross-origin always;
    add_header X-Frame-Options DENY always;
    try_files $uri /index.html;
}
```

## Cloudflare

1. **Cache Rule** (Caching → Cache Rules → Create): name "Service worker and manifest: no edge cache"; when
   _URI Path_ is in `/sw.js`, `/manifest.webmanifest`; then **Bypass cache**. With the origin's `no-cache` this is
   belt and braces, but it does not depend on Cloudflare's per-extension defaults or on the Browser Cache TTL.
2. **Browser Cache TTL** (Caching → Configuration): **Respect Existing Headers**, so Cloudflare stops writing
   `max-age=14400` onto responses that carry their own `Cache-Control`.
3. After deploying the nginx change: **purge** `/sw.js` once (Caching → Purge Cache → Custom Purge → URL).
4. Compression: Cloudflare keeps whatever encoding the origin sent for a cached file, so with `brotli_static` the
   edge copy becomes brotli. Unverified: whether Cloudflare forwards `Accept-Encoding: br` to this origin on the
   current plan. Check with the commands below; if assets still come back gzip, a Compression Rule
   (Rules → Compression Rules) for `/assets/*` set to "Brotli" makes the edge compress it instead.
5. Optional: a second Cache Rule making `/api/players/*/photo` **eligible for cache** (Cloudflare does not cache
   extensionless URLs by default). The API already answers photos with `public, max-age=31536000, immutable` and a
   versioned URL (HANDOFF §5.7), so the edge can keep them. Do not widen it to any other `/api/` path: those
   answers are private.

## Checking it

```sh
SITE=https://play.vectanix.com
JS=$(curl -s $SITE/ | grep -o '/assets/index-[^"]*\.js' | head -1)
curl -sI -H 'Accept-Encoding: br, gzip' "$SITE$JS" | grep -iE '^(content-encoding|cache-control|cf-cache-status)'
#   content-encoding: br
#   cache-control: public, max-age=31536000, immutable
curl -sI "$SITE/sw.js" | grep -iE '^(cache-control|cf-cache-status)'
#   cache-control: no-cache
#   cf-cache-status: BYPASS (or DYNAMIC)
curl -sI "$SITE/assets/nope.js" | head -1
#   HTTP/2 404
```

## What the service worker caches (for reference)

- **Precache** (cache-first, versioned, old versions removed on activate): the app's JS, CSS, fonts, `index.html`,
  `icon.svg` and the manifest. 40 entries, 872 KiB. The install icons are not precached; the OS reads them once at
  install.
- **Runtime** (`kachuful-photos`, cache-first): player photos only, at most 200 or 30 days unseen. Their URLs are
  public and versioned, so a cached copy is never stale and holds nothing private.
- **Not cached by the worker**: every other `/api/` answer. Those are private (a shared phone must not keep them
  after sign-out) and the app already keeps its own copies with ETags (`src/sync/useRemote.ts`).
