import fs from 'fs';
import sharp from 'sharp';

async function generate() {
  const svg = fs.readFileSync('public/logo.svg');
  await sharp(svg).resize(192, 192).png().toFile('public/pwa-192x192.png');
  await sharp(svg).resize(512, 512).png().toFile('public/pwa-512x512.png');
  await sharp(svg).resize(192, 192).png().toFile('public/apple-touch-icon.png');
  console.log('Icons generated!');
}
generate();
