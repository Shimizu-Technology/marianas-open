# Local font subsets

Latin, normal-style WOFF2 subsets from `@fontsource/outfit@5.3.0` and `@fontsource/dm-sans@5.3.0` (SIL Open Font License; licenses included). Outfit: 400/500/600/700/800/900. DM Sans: 400/500/600/700. The site's hero uses Outfit 900, preloaded in index.html. CSS uses font-display: swap; CJK glyphs use system sans-serif fallback. Italic or unused variable font axes are not downloaded.

These are vendored assets, not runtime npm dependencies. To refresh, obtain those package tarballs in a scratch directory and copy only the matching `files/<family>-latin-<weight>-normal.woff2` files and license. Keep CSS declarations and preload synchronized.
