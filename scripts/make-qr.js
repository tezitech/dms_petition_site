#!/usr/bin/env node
/**
 * Generate the petition QR code and point the site's share links at your real domain.
 *
 * Usage:
 *   npm run qr -- https://your-domain.org
 *   (or) node scripts/make-qr.js https://your-domain.org
 *   (or) SITE_URL=https://your-domain.org npm run qr
 *
 * Outputs (QR points to https://your-domain.org/#sign):
 *   public/qr-sign.png  (1200 x 1200)
 *   public/qr-sign.svg
 *
 * Also updates, in place:
 *   index.html  canonical, og:url, og:image, twitter:image
 *   flyer.html  the printed URL under the QR code
 */
const fs = require('fs');
const path = require('path');
const QRCode = require('qrcode');

const root = path.resolve(__dirname, '..');
const raw = process.argv[2] || process.env.SITE_URL;

if (!raw) {
  console.error('Usage: npm run qr -- https://your-domain.org');
  process.exit(1);
}

let origin;
try {
  const u = new URL(/^https?:\/\//i.test(raw) ? raw : `https://${raw}`);
  if (u.protocol !== 'https:') console.warn('Warning: the URL is not https. Vercel serves https; consider using it.');
  origin = `${u.protocol}//${u.host}`;
} catch {
  console.error(`Not a valid URL: ${raw}`);
  process.exit(1);
}

const signUrl = `${origin}/#sign`;
const outDir = path.join(root, 'public');
fs.mkdirSync(outDir, { recursive: true });

const opts = {
  errorCorrectionLevel: 'M', // survives small smudges on printed flyers
  margin: 4,                 // the "quiet zone" scanners need
  color: { dark: '#141f6b', light: '#ffffff' },
};

(async () => {
  await QRCode.toFile(path.join(outDir, 'qr-sign.png'), signUrl, { ...opts, type: 'png', width: 1200 });
  const svg = await QRCode.toString(signUrl, { ...opts, type: 'svg' });
  fs.writeFileSync(path.join(outDir, 'qr-sign.svg'), svg);
  console.log(`QR code -> ${signUrl}`);
  console.log('  wrote public/qr-sign.png (1200x1200)');
  console.log('  wrote public/qr-sign.svg');

  // index.html: canonical + social tags
  const indexPath = path.join(root, 'index.html');
  let html = fs.readFileSync(indexPath, 'utf8');
  html = html
    .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${origin}/$2`)
    .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${origin}/$2`)
    .replace(/(<meta property="og:image" content=")[^"]*(")/, `$1${origin}/images/og-image.jpg$2`)
    .replace(/(<meta name="twitter:image" content=")[^"]*(")/, `$1${origin}/images/og-image.jpg$2`);
  fs.writeFileSync(indexPath, html);
  console.log('  updated index.html (canonical, og:url, og:image, twitter:image)');

  // flyer.html: printed URL
  const flyerPath = path.join(root, 'flyer.html');
  let flyer = fs.readFileSync(flyerPath, 'utf8');
  const display = origin.replace(/^https?:\/\//, '');
  // Allow line breaks only at the dots so long addresses wrap cleanly on the flyer.
  const flyerDisplay = display.replace(/\./g, '<wbr>.');
  flyer = flyer.replace(/(<span data-site-url>)[\s\S]*?(<\/span>)/g, `$1${flyerDisplay}$2`);
  fs.writeFileSync(flyerPath, flyer);
  console.log(`  updated flyer.html (printed URL: ${display})`);
})().catch((err) => {
  console.error(err);
  process.exit(1);
});
