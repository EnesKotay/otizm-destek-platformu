/**
 * public/og-image.png (1200x630) üretir.
 *
 * Sosyal paylaşım önizlemeleri kare app ikonuyla kırpıldığı için markaya özel
 * bir OG görseline ihtiyaç var. Görsel elle güncellenmesin diye kaynağı burada
 * HTML olarak tutuluyor; metin değiştiğinde `npm run og:image` yeniden üretir.
 *
 * Kullanım: npm run og:image
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const outFile = path.join(root, 'public', 'og-image.png');

// Fontu base64 gömüyoruz: headless Chromium'da sistemde Plus Jakarta Sans
// bulunmadığı için aksi halde fallback fontla render edilirdi.
const fontLatin = readFileSync(
  path.join(root, 'public', 'fonts', 'plus-jakarta-sans-latin.woff2'),
).toString('base64');
const fontLatinExt = readFileSync(
  path.join(root, 'public', 'fonts', 'plus-jakarta-sans-latin-ext.woff2'),
).toString('base64');

const html = `<!doctype html>
<html lang="tr">
<head>
<meta charset="utf-8" />
<style>
  @font-face {
    font-family: 'Plus Jakarta Sans';
    font-weight: 400 800;
    font-display: block;
    src: url(data:font/woff2;base64,${fontLatin}) format('woff2');
    unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+2000-206F, U+20AC, U+2122;
  }
  @font-face {
    font-family: 'Plus Jakarta Sans';
    font-weight: 400 800;
    font-display: block;
    src: url(data:font/woff2;base64,${fontLatinExt}) format('woff2');
    unicode-range: U+0100-02BA, U+1E00-1E9F, U+2020, U+20A0-20AB, U+2C60-2C7F, U+A720-A7FF;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body {
    width: 1200px; height: 630px;
    font-family: 'Plus Jakarta Sans', sans-serif;
    background: #ffffff;
    display: flex; align-items: center;
    position: relative; overflow: hidden;
  }
  .glow-a {
    position: absolute; top: -180px; left: -140px;
    width: 620px; height: 620px; border-radius: 50%;
    background: rgba(37, 99, 235, 0.16); filter: blur(90px);
  }
  .glow-b {
    position: absolute; bottom: -220px; right: -120px;
    width: 640px; height: 640px; border-radius: 50%;
    background: rgba(99, 102, 241, 0.18); filter: blur(90px);
  }
  .wrap { position: relative; padding: 0 76px; width: 100%; }
  .brand { display: flex; align-items: center; gap: 18px; }
  .mark {
    width: 66px; height: 66px; border-radius: 20px;
    background: #2563eb; color: #fff;
    display: flex; align-items: center; justify-content: center;
    box-shadow: 0 12px 30px -8px rgba(37, 99, 235, 0.55);
  }
  .brand-name { font-size: 30px; font-weight: 800; color: #020617; letter-spacing: -0.02em; }
  .brand-sub {
    font-size: 14px; font-weight: 800; color: #2563eb;
    text-transform: uppercase; letter-spacing: 0.18em; margin-top: 3px;
  }
  h1 {
    margin-top: 52px;
    font-size: 68px; line-height: 1.08; font-weight: 800;
    letter-spacing: -0.035em; color: #020617; max-width: 940px;
  }
  h1 span { color: #2563eb; }
  p.sub {
    margin-top: 26px; font-size: 27px; line-height: 1.5;
    font-weight: 500; color: #475569; max-width: 860px;
  }
  .chips { margin-top: 46px; display: flex; gap: 14px; }
  .chip {
    display: flex; align-items: center; gap: 11px;
    background: #fff; border: 1px solid #e2e8f0; border-radius: 999px;
    padding: 14px 24px; font-size: 21px; font-weight: 700; color: #1e293b;
    box-shadow: 0 2px 10px -4px rgba(15, 23, 42, 0.10);
  }
  .chip svg { flex-shrink: 0; }
  .accent {
    position: absolute; left: 0; top: 0; bottom: 0; width: 14px;
    background: linear-gradient(180deg, #2563eb 0%, #6366f1 100%);
  }
</style>
</head>
<body>
  <div class="accent"></div>
  <div class="glow-a"></div>
  <div class="glow-b"></div>
  <div class="wrap">
    <div class="brand">
      <div class="mark">
        <svg width="34" height="34" viewBox="0 0 24 24" fill="none" stroke="currentColor"
             stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M11 14h2a2 2 0 1 0 0-4h-3c-.6 0-1.1.2-1.4.6L3 16"/>
          <path d="m7 20 1.6-1.4c.3-.4.8-.6 1.4-.6h4c1.1 0 2.1-.4 2.8-1.2l4.6-4.4a2 2 0 0 0-2.75-2.91l-4.2 3.9"/>
          <path d="m2 15 6 6"/>
          <path d="M19.5 8.5c.7-.7 1.5-1.6 1.5-2.7A2.7 2.7 0 0 0 16 4a2.7 2.7 0 0 0-5 1.8c0 1.1.8 2 1.5 2.7L16 12Z"/>
        </svg>
      </div>
      <div>
        <div class="brand-name">Otizm Destek</div>
        <div class="brand-sub">Gelişim Platformu</div>
      </div>
    </div>

    <h1>Çocuğunuzun gelişim yolculuğunda <span>yalnız değilsiniz.</span></h1>
    <p class="sub">Günlük takip, acil durum kartı ve doğrulanmış uzmanlarla kontrollü paylaşım — tek yerde.</p>

    <div class="chips">
      <div class="chip">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#059669"
             stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>
        </svg>
        Ücretsiz aile hesabı
      </div>
      <div class="chip">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#059669"
             stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>
        </svg>
        Kontrollü paylaşım
      </div>
      <div class="chip">
        <svg width="21" height="21" viewBox="0 0 24 24" fill="none" stroke="#059669"
             stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21.801 10A10 10 0 1 1 17 3.335"/><path d="m9 11 3 3L22 4"/>
        </svg>
        Doğrulanmış uzmanlar
      </div>
    </div>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
// deviceScaleFactor bilinçli olarak 1: çıktı, index.html'de beyan edilen
// og:image:width/height (1200x630) ile birebir eşleşmeli.
const page = await browser.newPage({
  viewport: { width: 1200, height: 630 },
  deviceScaleFactor: 1,
});
await page.setContent(html, { waitUntil: 'load' });
await page.evaluate(() => document.fonts.ready);
const buffer = await page.screenshot({ type: 'png' });
await browser.close();

writeFileSync(outFile, buffer);
console.log(`✓ ${path.relative(root, outFile)} yazıldı (${(buffer.length / 1024).toFixed(0)} KB)`);
