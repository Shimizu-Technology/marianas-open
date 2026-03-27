# PWA Icons

Required files (to be generated from mo-logo-white.png):
- icon-192.png (192x192) — standard PWA icon
- icon-512.png (512x512) — large PWA icon  
- icon-512-maskable.png (512x512) — maskable icon with safe zone padding
- screenshot-wide.jpg (1280x800) — wide screenshot for app store-style display
- screenshot-mobile.jpg (390x844) — mobile screenshot

Generate with ImageMagick or Figma export.
Quick command: convert mo-logo.png -resize 192x192 -gravity center -extent 192x192 -background "#07111f" icon-192.png
