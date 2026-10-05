import { chromium } from '@playwright/test';
import fs from 'fs';
import path from 'path';

(async () => {
  console.log('Starting Playwright...');
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    recordVideo: {
      dir: './videos/',
      size: { width: 1280, height: 720 },
    }
  });
  
  const page = await context.newPage();
  
  console.log('Navigating to local dev server...');
  try {
    await page.goto('http://localhost:5173/destek-ara', { waitUntil: 'networkidle', timeout: 10000 });
  } catch (e) {
    console.log('Timeout or error navigating, but proceeding...', e.message);
  }

  // Wait a bit to ensure it's loaded
  await page.waitForTimeout(2000);

  // Type in search bar
  console.log('Typing in search...');
  await page.getByPlaceholder('Örn. Çocuğum konuşmaya ne zaman başladı?').fill('çok yoruldum');
  await page.keyboard.press('Enter');
  
  // Wait to see the empathy engine
  await page.waitForTimeout(4000);

  // Type in another search
  console.log('Searching for öfke nöbeti...');
  await page.getByPlaceholder('Örn. Çocuğum konuşmaya ne zaman başladı?').fill('');
  await page.getByPlaceholder('Örn. Çocuğum konuşmaya ne zaman başladı?').fill('öfke nöbeti');
  await page.keyboard.press('Enter');

  // Wait for results
  await page.waitForTimeout(4000);

  // Click on a pill
  console.log('Clicking on pill...');
  const pill = page.getByText('+ Isırma', { exact: true });
  if (await pill.count() > 0) {
    await pill.first().click();
  }

  await page.waitForTimeout(4000);

  console.log('Closing context to save video...');
  const videoPath = await page.video().path();
  await context.close();
  await browser.close();
  
  console.log('Video saved to:', videoPath);
  
  // Move video to the correct folder
  const targetDir = path.resolve('/Users/eneskotay/Development/Otizm/frontend/public/videos/tutorials/');
  if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
  }
  
  const targetPath = path.join(targetDir, '25-ai-destekli-cozum-arama.webm');
  fs.renameSync(videoPath, targetPath);
  console.log('Video moved to:', targetPath);
  
})();
