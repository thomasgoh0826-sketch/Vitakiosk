# Site Demo Asset Pipeline

## Manifest

All demo media is declared in `apps/site/src/content/demoAssets.ts`.

To replace assets later:

1. Add approved compressed screenshots or videos.
2. Confirm they contain only mock/demo data.
3. Update the manifest path and source label.
4. Run `npm.cmd run site:test` and `npm.cmd run site:build`.

## Recommended Sizes

- Website hero/poster images: 1600x1000 WebP/JPG.
- iPad demo screenshots: 1366x1024 or 1024x768.
- Large kiosk video: 1920x1080 MP4, web-optimized.
- Vertical kiosk optional: 1080x1920 MP4, web-optimized.

## Compression

Use compressed web assets. Keep raw videos, raw audio, logs, customer data, and model files untracked. Ask before committing large generated videos.

## Privacy Checklist

- No real patient identity.
- No real hospital logo.
- No customer or sales data.
- No private ERP database.
- No screenshots from protected `C:\Users\Admin\Documents\Playground\release`.
- No medical or treatment claims.
