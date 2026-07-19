import playwright from '../frontend/node_modules/playwright-core/index.js';
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const root = process.cwd();
const htmlPath = path.join(root, 'YAYIN-RAPORU-2026.html');
const pdfPath = path.join(root, 'Otizm-Destek-Platformu-Yayin-Raporu-Temmuz-2026.pdf');
const browser = await playwright.chromium.launch({
  executablePath: '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',
  headless: true,
});
const page = await browser.newPage();
await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'networkidle' });
await page.emulateMedia({ media: 'print' });
await page.pdf({
  path: pdfPath,
  format: 'A4',
  printBackground: true,
  preferCSSPageSize: true,
  displayHeaderFooter: true,
  headerTemplate: '<div style="font-size:7px;color:#6b7280;width:100%;padding:0 14mm;text-align:right;">Otizm Destek Platformu · Temmuz 2026</div>',
  footerTemplate: '<div style="font-size:7px;color:#6b7280;width:100%;padding:0 14mm;display:flex;justify-content:space-between;"><span>Teknik yayın ve maliyet raporu</span><span><span class="pageNumber"></span> / <span class="totalPages"></span></span></div>',
  margin: { top: '18mm', right: '14mm', bottom: '19mm', left: '14mm' },
});
await browser.close();
