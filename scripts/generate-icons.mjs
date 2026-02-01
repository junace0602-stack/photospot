import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const inputPath = path.join(__dirname, '..', 'logo.jpg');
const outputDir = path.join(__dirname, '..', 'public', 'icons');

// Ensure output directory exists
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

const sizes = [
  { name: '16.png', size: 16 },
  { name: '32.png', size: 32 },
  { name: '48.png', size: 48 },
  { name: '72.png', size: 72 },
  { name: '96.png', size: 96 },
  { name: '128.png', size: 128 },
  { name: '144.png', size: 144 },
  { name: '152.png', size: 152 },
  { name: '180.png', size: 180 },
  { name: '192.png', size: 192 },
  { name: '384.png', size: 384 },
  { name: '512.png', size: 512 },
  { name: 'favicon.ico', size: 32 },
];

async function generateIcons() {
  console.log('Generating icons from:', inputPath);

  for (const { name, size } of sizes) {
    const outputPath = path.join(outputDir, name);

    try {
      await sharp(inputPath)
        .resize(size, size, {
          fit: 'contain',
          background: { r: 255, g: 255, b: 255, alpha: 1 }
        })
        .png()
        .toFile(outputPath);

      console.log(`Created: ${name} (${size}x${size})`);
    } catch (err) {
      console.error(`Error creating ${name}:`, err.message);
    }
  }

  // Also copy to public root for favicon
  const faviconSrc = path.join(outputDir, '32.png');
  const faviconDest = path.join(__dirname, '..', 'public', 'favicon.png');
  if (fs.existsSync(faviconSrc)) {
    fs.copyFileSync(faviconSrc, faviconDest);
    console.log('Copied favicon to public/favicon.png');
  }

  console.log('Done!');
}

generateIcons().catch(console.error);
