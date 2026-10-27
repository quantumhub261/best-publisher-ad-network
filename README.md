# Publisher Ad Network Guide

Static site for best-publisher-ad-network.com. No dependencies, Node 18+.

- `node build.mjs` builds `dist/` (clean URLs, used by Cloudflare Pages)
- `node build.mjs --preview` builds `dist-preview/` (links end in index.html, opens from any folder)

Content lives in `content/*.html` (JSON front matter + HTML), network data in `data/networks.json`, site settings in `site.json`.
To update figures, edit `data/networks.json`, set `updated` in `site.json`, and commit: Cloudflare Pages rebuilds on every push.

Cloudflare Pages settings: build command `node build.mjs`, output directory `dist`.
