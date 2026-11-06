// Generates the PWA icons for both apps: a gold "HM" monogram on near-black.
// Usage: pnpm install (root) && pnpm icons   — writes apps/*/public/icons/*
import { mkdirSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const sharp = (await import('sharp')).default;

const svg = (size, { maskable = false, textScale = 1 } = {}) => {
  const pad = maskable ? size * 0.18 : size * 0.08;
  const inner = size - pad * 2;
  const font = Math.round(inner * 0.52 * textScale);
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
  <defs><radialGradient id="g" cx="30%" cy="25%" r="90%">
    <stop offset="0%" stop-color="#F2D69A"/><stop offset="45%" stop-color="#C49A50"/><stop offset="100%" stop-color="#8A672C"/>
  </radialGradient></defs>
  <rect width="${size}" height="${size}" fill="#0C0D0F"/>
  <circle cx="${size / 2}" cy="${size / 2}" r="${inner / 2}" fill="url(#g)"/>
  <text x="50%" y="50%" dy="0.36em" text-anchor="middle" font-family="Georgia, 'DejaVu Serif', serif" font-weight="700" font-size="${font}" fill="#1A1408">HM</text>
</svg>`;
};

const favicon = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs><radialGradient id="g" cx="30%" cy="25%" r="90%">
    <stop offset="0%" stop-color="#F2D69A"/><stop offset="45%" stop-color="#C49A50"/><stop offset="100%" stop-color="#8A672C"/>
  </radialGradient></defs>
  <rect width="64" height="64" rx="14" fill="#0C0D0F"/>
  <circle cx="32" cy="32" r="24" fill="url(#g)"/>
  <text x="32" y="32" dy="0.36em" text-anchor="middle" font-family="Georgia, serif" font-weight="700" font-size="26" fill="#1A1408">HM</text>
</svg>`;

for (const app of ['customer', 'staff']) {
  const dir = join(root, 'apps', app, 'public', 'icons');
  mkdirSync(dir, { recursive: true });
  writeFileSync(join(dir, 'favicon.svg'), favicon);
  await sharp(Buffer.from(svg(192))).png().toFile(join(dir, 'icon-192.png'));
  await sharp(Buffer.from(svg(512))).png().toFile(join(dir, 'icon-512.png'));
  await sharp(Buffer.from(svg(512, { maskable: true }))).png().toFile(join(dir, 'icon-maskable-512.png'));
  await sharp(Buffer.from(svg(180))).png().toFile(join(dir, 'apple-touch-icon.png'));
  console.log(`icons written to apps/${app}/public/icons`);
}
