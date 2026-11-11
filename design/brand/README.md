# Baithak — brand assets for play.vectanix.com

Working name: **Baithak**. If the name changes, only `wordmark-*`, `lockup-*` and the `og-image.png` files change; the mark and icons stay.

## Platform (`platform/`)

| File                                               | Size       | Use                                                                               |
| -------------------------------------------------- | ---------- | --------------------------------------------------------------------------------- |
| `mark.svg` / `mark-on-light.svg` / `mark-mono.svg` | vector     | Logo mark for dark / light / single-colour (`currentColor`)                       |
| `wordmark-light.svg` / `wordmark-dark.svg`         | vector     | Wordmark alone (text outlined to paths)                                           |
| `lockup-light.svg` / `lockup-dark.svg`             | vector     | Mark + wordmark                                                                   |
| `favicon.svg`                                      | vector     | Browser tab, modern browsers                                                      |
| `favicon-32.svg` → `favicon-32.png`                | 32 × 32    | Tab and bookmarks                                                                 |
| `favicon-16.svg` → `favicon-16.png`                | 16 × 16    | Pixel-tuned art for the smallest size                                             |
| `apple-touch-icon.svg` → `apple-touch-icon.png`    | 180 × 180  | iOS home screen (opaque, full bleed)                                              |
| `icon.svg` → `icon-192.png`, `icon-512.png`        | 192, 512   | Manifest, `purpose: any`                                                          |
| `icon-maskable.svg` → `icon-maskable-512.png`      | 512        | Manifest, `purpose: maskable`; mark radius 150 px inside the 204.8 px safe circle |
| `og-image.png`                                     | 1200 × 630 | Link previews                                                                     |

## Games (`games/<id>/`, ids: `kachuful`, `kaali-teeri`, `ishaara`)

| File                                                                  | Size              | Use                                  |
| --------------------------------------------------------------------- | ----------------- | ------------------------------------ |
| `icon.svg` → `icon-512.png`                                           | 512               | Game icon (rounded tile)             |
| `icon-maskable.svg` → `icon-maskable-512.png`, `apple-touch-icon.png` | 512, 180          | Full-bleed versions                  |
| `tile-art.svg`                                                        | 640 × 400 (16:10) | Landing card art                     |
| `og-image.png`                                                        | 1200 × 630        | Preview for `play.vectanix.com/<id>` |

## Head tags

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml" />
<link rel="icon" href="/favicon-32.png" sizes="32x32" type="image/png" />
<link rel="icon" href="/favicon-16.png" sizes="16x16" type="image/png" />
<link rel="apple-touch-icon" href="/apple-touch-icon.png" />
<link rel="manifest" href="/manifest.webmanifest" />
<meta property="og:image" content="https://play.vectanix.com/og-image.png" />
<meta property="og:image:width" content="1200" />
<meta property="og:image:height" content="630" />
<meta name="twitter:card" content="summary_large_image" />
```

On a game route (e.g. `/kachuful`) swap `og:image` and `apple-touch-icon` for that game's files.

## Manifest icons

```json
"icons": [
  { "src": "/icon-192.png", "sizes": "192x192", "type": "image/png", "purpose": "any" },
  { "src": "/icon-512.png", "sizes": "512x512", "type": "image/png", "purpose": "any" },
  { "src": "/icon-maskable-512.png", "sizes": "512x512", "type": "image/png", "purpose": "maskable" }
]
```

## Tokens

`tokens.css` holds every theme (`.theme-sunset`, `.theme-emerald`, `.theme-yerba`, `.theme-paper`). New tokens are marked `/* NEW */`. Existing-app names (`--color-*`, `--font-*`, `--radius-*`) are assumed; rename them to your prefix. Fonts used: Bricolage Grotesque, Instrument Sans, Instrument Serif, Cinzel, Space Mono, IBM Plex Mono (all Google Fonts). These were matched to the screenshots by eye, so check them against your real tokens.
