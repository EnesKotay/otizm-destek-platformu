/**
 * Public rotaları build sonrası statik HTML'e döker.
 *
 * NEDEN: WhatsApp, Facebook, LinkedIn ve Twitter crawler'ları JavaScript
 * çalıştırmaz. Uygulama tamamen CSR olduğu için bu botlar boş bir <div id="root">
 * ve index.html'deki sabit etiketlerden başka bir şey görmez — yani tanıtım
 * sayfası dışındaki her public sayfa paylaşıldığında yanlış başlık/açıklama ile
 * görünür. Googlebot JS çalıştırsa da render kuyruğu gecikmeli işler.
 *
 * NASIL: dist/ statik olarak servis edilir, her rota headless Chromium'da
 * açılır ve oluşan DOM diske yazılır. Bundle korunur; tarayıcıda React yine
 * devreye girip sayfayı normal SPA olarak devralır.
 *
 * ÖNEMLİ: Chromium bulunamazsa (örn. node:alpine tabanlı Docker imajı) script
 * uyarı basıp BAŞARIYLA çıkar — prerender bir iyileştirmedir, build'i kırmamalı.
 */
import { createServer } from 'node:http';
import { readFile, writeFile, mkdir, access } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '..');
const distDir = path.join(root, 'dist');

/** Prerender edilecek, giriş gerektirmeyen rotalar. */
const ROUTES = [
  '/',
  '/tanitim',
  '/kriz-aninda-ne-yapmali',
  '/uzmanlar-icin',
  '/guven-merkezi',
  '/kvkk',
  '/gizlilik',
  '/kullanim-sartlari',
  '/tibbi-uyari',
];

/**
 * Prerender sırasında sayfa 127.0.0.1 üzerinden servis edildiği için
 * RouteMetadata canonical/og:url/og:image değerlerini `window.location.origin`
 * ile hesaplar. Çıktıya localhost adresi gömülmesin diye yayın adresiyle
 * değiştiriyoruz.
 */
const SITE_URL = (process.env.VITE_PUBLIC_SITE_URL || 'https://otizmdestek.com').replace(/\/$/, '');

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript',
  '.mjs': 'text/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.webp': 'image/webp',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.txt': 'text/plain; charset=utf-8',
  '.xml': 'application/xml',
};

async function exists(filePath) {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

/** dist/ için SPA fallback'li küçük statik sunucu. */
async function startServer() {
  const server = createServer(async (req, res) => {
    const urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
    let filePath = path.join(distDir, urlPath);

    if (!filePath.startsWith(distDir)) {
      res.writeHead(403).end();
      return;
    }

    if (!path.extname(filePath) || !(await exists(filePath))) {
      filePath = path.join(distDir, 'index.html');
    }

    try {
      const body = await readFile(filePath);
      res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
      res.end(body);
    } catch {
      res.writeHead(404).end();
    }
  });

  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  return { server, port: server.address().port };
}

async function main() {
  if (!(await exists(path.join(distDir, 'index.html')))) {
    console.warn('⚠ prerender atlandı: dist/index.html bulunamadı (önce vite build çalışmalı).');
    return;
  }

  let chromium;
  try {
    ({ chromium } = await import('@playwright/test'));
  } catch {
    console.warn('⚠ prerender atlandı: @playwright/test yüklü değil.');
    return;
  }

  let browser;
  try {
    browser = await chromium.launch();
  } catch (error) {
    console.warn(`⚠ prerender atlandı: Chromium başlatılamadı (${error.message.split('\n')[0]}).`);
    console.warn('  Statik index.html meta etiketleri yine de geçerli; yalnızca rota bazlı prerender yapılamadı.');
    return;
  }

  if (!process.env.VITE_PUBLIC_SITE_URL) {
    console.warn(`⚠ VITE_PUBLIC_SITE_URL tanımlı değil; kanonik adresler için ${SITE_URL} varsayılıyor.`);
  }

  const { server, port } = await startServer();
  const baseUrl = `http://127.0.0.1:${port}`;
  let written = 0;

  try {
    for (const route of ROUTES) {
      const page = await browser.newPage();
      try {
        // Backend build ortamında yok; istekleri hemen keserek AuthBootstrap'in
        // ağ zaman aşımı beklemesini önlüyoruz.
        await page.route('**/api/**', (r) => r.abort());

        await page.goto(baseUrl + route, { waitUntil: 'load', timeout: 30_000 });

        // Sayfaların çoğu lazy yüklendiği için "#root doludur" koşulu yetmez:
        // Suspense fallback'i (spinner) de bu koşulu sağlar ve boş sayfa
        // kaydedilir. Gerçek içeriğin geldiğini h1 + metin uzunluğuyla doğrula.
        await page.waitForFunction(
          () =>
            !!document.querySelector('link[rel="canonical"]') &&
            !!document.querySelector('h1') &&
            document.body.innerText.trim().length > 300,
          { timeout: 15_000 },
        );
        await page.evaluate(() => document.fonts.ready);

        const rendered = await page.evaluate(() => document.documentElement.outerHTML);
        const html = `<!doctype html>\n${rendered.split(baseUrl).join(SITE_URL)}`;

        if (route === '/') {
          await writeFile(path.join(distDir, 'index.html'), html);
        } else {
          const slug = route.replace(/^\//, '');
          // Dizin biçimi nginx'in `try_files $uri $uri/` kuralı için,
          // düz .html dosyası ise Vercel'in clean-URL eşlemesi için yazılır;
          // böylece iki dağıtım hedefi de prerender çıktısını servis eder.
          await mkdir(path.join(distDir, slug), { recursive: true });
          await writeFile(path.join(distDir, slug, 'index.html'), html);
          await writeFile(path.join(distDir, `${slug}.html`), html);
        }
        written += 1;
        console.log(`  ✓ ${route}`);
      } catch (error) {
        console.warn(`  ✗ ${route} prerender edilemedi: ${error.message.split('\n')[0]}`);
      } finally {
        await page.close();
      }
    }
  } finally {
    await browser.close();
    server.close();
  }

  console.log(`✓ prerender tamam: ${written}/${ROUTES.length} rota.`);
}

await main();
