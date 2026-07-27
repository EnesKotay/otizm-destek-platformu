import { chromium } from '@playwright/test';
import { mkdir, copyFile, writeFile, unlink } from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const BASE_URL = process.env.TUTORIAL_BASE_URL || 'http://localhost:5173';
const DEMO_EMAIL = process.env.TUTORIAL_EMAIL || 'video.demo@otizm.local';
const DEMO_PASSWORD = process.env.TUTORIAL_PASSWORD || 'VideoDemo123!';
const ONBOARDING_EMAIL = process.env.TUTORIAL_ONBOARDING_EMAIL || 'video.onboarding@otizm.local';
const EXPERT_EMAIL = process.env.TUTORIAL_EXPERT_EMAIL || 'video.expert@otizm.local';
const ADMIN_EMAIL = process.env.TUTORIAL_ADMIN_EMAIL || 'admin@local.test';
const OUTPUT_DIR = path.resolve(process.cwd(), '../outputs/tutorial-videos');
const RAW_DIR = path.join(OUTPUT_DIR, '.raw');
const PUBLIC_VIDEO_DIR = path.resolve(process.cwd(), 'public/videos/tutorials');
const VIEWPORT = { width: 1280, height: 720 };
const VIDEO_NAMES = [
  '01-platforma-genel-bakis',
  '02-ebeveyn-hizli-baslangic',
  '03-kullanici-rehberi',
  '04-ana-sayfa-ve-navigasyon',
  '05-cocuk-profili',
  '06-gunluk-duygu-ve-uyku',
  '07-ilac-takibi',
  '08-gelisim-paneli',
  '09-hedefler-ve-egzersizler',
  '10-odevler-ve-rutinler',
  '11-notlar-takvim-acil-kart',
  '12-uzman-bulma-ve-randevu',
  '13-mesajlar-gizlilik-ayarlar',
  '14-topluluk-forum-bulusmalar',
  '15-bilgi-bankasi-kriz-yardim',
  '16-uzman-ana-sayfa-danisanlar',
  '17-uzman-randevu-takvimi',
  '18-uzman-gorev-ve-ev-plani',
  '19-bep-raporu',
  '20-uzman-iletisim-ve-kaynaklar',
  '21-yonetim-genel-bakis-analitik',
  '22-uzman-basvurulari-kullanicilar',
  '23-icerik-ve-moderasyon',
  '24-aktivite-kaydi-sistem-ayarlari',
];

const ACCOUNT_BY_ROLE = {
  parent: { email: DEMO_EMAIL, password: DEMO_PASSWORD },
  expert: { email: EXPERT_EMAIL, password: DEMO_PASSWORD },
  admin: { email: ADMIN_EMAIL, password: DEMO_PASSWORD },
};

const authStateCache = new Map();

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function ensureTutorialUi(page) {
  await page.evaluate(() => {
    if (!document.getElementById('tutorial-recorder-style')) {
      const style = document.createElement('style');
      style.id = 'tutorial-recorder-style';
      style.textContent = `
        #tutorial-caption {
          position: fixed; left: 30px; bottom: 28px; z-index: 2147483646;
          width: min(540px, calc(100vw - 60px)); padding: 17px 20px;
          color: white; background: rgba(15, 23, 42, .93);
          border: 1px solid rgba(255,255,255,.16); border-radius: 20px;
          box-shadow: 0 22px 55px rgba(15,23,42,.35);
          backdrop-filter: blur(14px); font-family: Inter, ui-sans-serif, system-ui, sans-serif;
          opacity: 0; transform: translateY(14px); transition: .32s ease;
          pointer-events: none;
        }
        #tutorial-caption.visible { opacity: 1; transform: translateY(0); }
        #tutorial-caption .step { color: #a5b4fc; font-size: 12px; font-weight: 800; letter-spacing: .13em; text-transform: uppercase; }
        #tutorial-caption .title { margin-top: 5px; font-size: 22px; line-height: 1.2; font-weight: 900; }
        #tutorial-caption .body { margin-top: 7px; color: #e2e8f0; font-size: 15px; line-height: 1.5; font-weight: 550; }
        #tutorial-cursor {
          position: fixed; left: -60px; top: -60px; z-index: 2147483647;
          width: 34px; height: 42px; margin: -4px 0 0 -5px;
          filter: drop-shadow(0 5px 7px rgba(15,23,42,.5)); opacity: 0;
          transition: left .48s cubic-bezier(.22,.8,.24,1), top .48s cubic-bezier(.22,.8,.24,1), transform .14s ease;
          pointer-events: none;
        }
        #tutorial-cursor.visible { opacity: 1; }
        #tutorial-cursor.clicking { transform: scale(.78); }
        #tutorial-focus {
          position: fixed; z-index: 2147483645; border: 4px solid #4f46e5; border-radius: 16px;
          box-shadow: 0 0 0 7px rgba(79,70,229,.18), 0 0 0 9999px rgba(15,23,42,.13);
          transition: all .48s cubic-bezier(.22,.8,.24,1); pointer-events: none;
        }
        #tutorial-progress {
          position: fixed; right: 24px; top: 20px; z-index: 2147483646;
          min-width: 150px; padding: 10px 13px; border-radius: 14px;
          color: #1e1b4b; background: rgba(255,255,255,.95); border: 1px solid rgba(99,102,241,.22);
          box-shadow: 0 10px 30px rgba(15,23,42,.16); font: 800 12px/1.2 Inter,ui-sans-serif,system-ui;
          opacity: 0; transform: translateY(-8px); transition: .25s ease; pointer-events: none;
        }
        #tutorial-progress.visible { opacity: 1; transform: translateY(0); }
        #tutorial-progress .track { height: 4px; margin-top: 7px; overflow: hidden; border-radius: 99px; background: #e2e8f0; }
        #tutorial-progress .fill { height: 100%; border-radius: inherit; background: linear-gradient(90deg,#4f46e5,#14b8a6); transition: width .35s ease; }
        #tutorial-stage {
          position: fixed; inset: 0; z-index: 2147483647; display: grid; place-items: center; overflow: hidden;
          color: white; background: linear-gradient(135deg,#0f172a 0%,#312e81 54%,#0f766e 120%);
          font-family: Inter,ui-sans-serif,system-ui,sans-serif; opacity: 0; transition: opacity .4s ease;
        }
        #tutorial-stage.visible { opacity: 1; }
        #tutorial-stage::before { content:""; position:absolute; width:620px; height:620px; border-radius:999px; right:-180px; top:-260px; background:rgba(129,140,248,.22); filter:blur(8px); }
        #tutorial-stage::after { content:""; position:absolute; width:520px; height:520px; border-radius:999px; left:-190px; bottom:-270px; background:rgba(45,212,191,.18); filter:blur(8px); }
        #tutorial-stage .inner { position:relative; z-index:1; width:min(900px,calc(100vw - 100px)); text-align:center; }
        #tutorial-stage .brand { display:inline-flex; align-items:center; gap:10px; font-size:15px; font-weight:850; color:#c7d2fe; }
        #tutorial-stage .logo { display:grid; place-items:center; width:42px; height:42px; border-radius:14px; color:white; background:#4f46e5; font-size:22px; font-weight:950; box-shadow:0 12px 30px rgba(79,70,229,.38); }
        #tutorial-stage .badge { display:inline-flex; margin-top:36px; padding:8px 13px; border-radius:999px; background:rgba(255,255,255,.12); border:1px solid rgba(255,255,255,.17); color:#e0e7ff; font-size:12px; font-weight:850; letter-spacing:.08em; text-transform:uppercase; }
        #tutorial-stage h1 { margin:18px auto 0; max-width:880px; color:white; font-size:54px; line-height:1.06; letter-spacing:-.035em; font-weight:950; }
        #tutorial-stage p { margin:18px auto 0; max-width:760px; color:#dbeafe; font-size:20px; line-height:1.55; font-weight:550; }
        #tutorial-stage .path { display:inline-flex; margin-top:28px; padding:10px 15px; border-radius:12px; color:#ccfbf1; background:rgba(15,23,42,.32); font-size:13px; font-weight:800; }
        #tutorial-stage.outro h1 { font-size:48px; }
        #tutorial-stage .check { display:grid; place-items:center; width:82px; height:82px; margin:0 auto 22px; border-radius:999px; background:white; color:#0f766e; font-size:42px; font-weight:950; box-shadow:0 20px 50px rgba(15,23,42,.3); }
      `;
      document.head.appendChild(style);
    }
    if (!document.getElementById('tutorial-caption')) {
      const caption = document.createElement('div');
      caption.id = 'tutorial-caption';
      caption.innerHTML = '<div class="step"></div><div class="title"></div><div class="body"></div>';
      document.body.appendChild(caption);
    }
    if (!document.getElementById('tutorial-cursor')) {
      const cursor = document.createElement('div');
      cursor.id = 'tutorial-cursor';
      cursor.innerHTML = '<svg viewBox="0 0 36 44" width="34" height="42" aria-hidden="true"><path d="M3 2v31l8-8 7 16 7-4-7-15h13L3 2Z" fill="white" stroke="#0f172a" stroke-width="3" stroke-linejoin="round"/></svg>';
      document.body.appendChild(cursor);
    }
    if (!document.getElementById('tutorial-progress')) {
      const progress = document.createElement('div');
      progress.id = 'tutorial-progress';
      progress.innerHTML = '<div class="label"></div><div class="track"><div class="fill"></div></div>';
      document.body.appendChild(progress);
    }
  });
}

async function caption(page, step, title, body, duration = 3200) {
  await ensureTutorialUi(page);
  await page.evaluate(({ step, title, body }) => {
    const card = document.getElementById('tutorial-caption');
    card.querySelector('.step').textContent = step;
    card.querySelector('.title').textContent = title;
    card.querySelector('.body').textContent = body;
    card.classList.add('visible');
    const progress = document.getElementById('tutorial-progress');
    const match = step.match(/(\d+)\s*\/\s*(\d+)/);
    if (match) {
      const current = Number(match[1]);
      const total = Number(match[2]);
      progress.querySelector('.label').textContent = `Adım ${current} / ${total}`;
      progress.querySelector('.fill').style.width = `${Math.round((current / total) * 100)}%`;
      progress.classList.add('visible');
    }
  }, { step, title, body });
  await sleep(duration);
  await page.evaluate(() => {
    document.getElementById('tutorial-caption')?.classList.remove('visible');
    document.getElementById('tutorial-focus')?.remove();
    document.getElementById('tutorial-cursor')?.classList.remove('visible', 'clicking');
  }).catch(() => {});
  await sleep(260);
}

async function pointTo(page, locator, { click = false, padding = 8 } = {}) {
  await locator.scrollIntoViewIfNeeded();
  await sleep(450);
  const box = await locator.boundingBox();
  if (!box) throw new Error('Vurgulanacak öğe ekranda bulunamadı.');
  await ensureTutorialUi(page);
  await page.evaluate(({ box, padding }) => {
    let focus = document.getElementById('tutorial-focus');
    if (!focus) {
      focus = document.createElement('div');
      focus.id = 'tutorial-focus';
      document.body.appendChild(focus);
    }
    focus.style.left = `${box.x - padding}px`;
    focus.style.top = `${box.y - padding}px`;
    focus.style.width = `${box.width + padding * 2}px`;
    focus.style.height = `${box.height + padding * 2}px`;
    const cursor = document.getElementById('tutorial-cursor');
    cursor.style.left = `${box.x + box.width / 2}px`;
    cursor.style.top = `${box.y + box.height / 2}px`;
    cursor.classList.add('visible');
  }, { box, padding });
  await sleep(800);
  if (click) {
    await page.evaluate(() => document.getElementById('tutorial-cursor')?.classList.add('clicking'));
    await sleep(160);
    await locator.click();
    await sleep(180);
    await page.evaluate(() => document.getElementById('tutorial-cursor')?.classList.remove('clicking')).catch(() => {});
  }
}

async function typeInto(page, locator, value) {
  await pointTo(page, locator, { click: true, padding: 5 });
  await locator.fill('');
  await locator.pressSequentially(value, { delay: 45 });
  await sleep(500);
}

async function scrollTo(page, locator) {
  await locator.scrollIntoViewIfNeeded();
  await sleep(1200);
}

async function waitForPageReady(page) {
  await page.waitForLoadState('domcontentloaded');
  await page.evaluate(() => document.fonts?.ready).catch(() => {});
  await page.locator('main, [role="main"]').first().waitFor({ state: 'visible', timeout: 10_000 }).catch(() => {});
  await sleep(900);
}

async function goTo(page, route) {
  await page.goto(`${BASE_URL}${route}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
  await waitForPageReady(page);
}

async function showIntro(page, tour) {
  await ensureTutorialUi(page);
  await page.evaluate((tour) => {
    document.getElementById('tutorial-caption')?.classList.remove('visible');
    document.getElementById('tutorial-progress')?.classList.remove('visible');
    document.getElementById('tutorial-focus')?.remove();
    document.getElementById('tutorial-cursor')?.classList.remove('visible');
    document.getElementById('tutorial-stage')?.remove();

    const stage = document.createElement('div');
    stage.id = 'tutorial-stage';
    const inner = document.createElement('div');
    inner.className = 'inner';
    inner.innerHTML = `
      <div class="brand"><span class="logo">O</span><span>Otizm Destek Platformu</span></div>
      <div><span class="badge"></span></div>
      <h1></h1><p></p><span class="path"></span>
    `;
    inner.querySelector('.badge').textContent = `${tour.series} · ${tour.index}`;
    inner.querySelector('h1').textContent = tour.title;
    inner.querySelector('p').textContent = tour.description;
    inner.querySelector('.path').textContent = tour.pathLabel;
    stage.appendChild(inner);
    document.body.appendChild(stage);
    requestAnimationFrame(() => stage.classList.add('visible'));
  }, tour);
  await sleep(2600);
}

async function capturePoster(page, name) {
  const publicPoster = path.join(PUBLIC_VIDEO_DIR, `${name}.png`);
  const outputPoster = path.join(OUTPUT_DIR, `${name}.png`);
  await page.screenshot({ path: publicPoster, animations: 'disabled' });
  await copyFile(publicPoster, outputPoster);
}

async function hideStage(page) {
  await page.evaluate(() => document.getElementById('tutorial-stage')?.classList.remove('visible'));
  await sleep(420);
  await page.evaluate(() => document.getElementById('tutorial-stage')?.remove());
}

async function showOutro(page, tour) {
  await ensureTutorialUi(page);
  await page.evaluate((tour) => {
    document.getElementById('tutorial-caption')?.classList.remove('visible');
    document.getElementById('tutorial-progress')?.classList.remove('visible');
    document.getElementById('tutorial-focus')?.remove();
    document.getElementById('tutorial-cursor')?.classList.remove('visible');
    document.getElementById('tutorial-stage')?.remove();

    const stage = document.createElement('div');
    stage.id = 'tutorial-stage';
    stage.className = 'outro';
    const inner = document.createElement('div');
    inner.className = 'inner';
    inner.innerHTML = '<div class="check">✓</div><div><span class="badge">Video tamamlandı</span></div><h1></h1><p></p><span class="path"></span>';
    inner.querySelector('h1').textContent = tour.outroTitle || 'Artık bu alanı kullanmaya hazırsınız';
    inner.querySelector('p').textContent = tour.outro || tour.description;
    inner.querySelector('.path').textContent = tour.pathLabel;
    stage.appendChild(inner);
    document.body.appendChild(stage);
    requestAnimationFrame(() => stage.classList.add('visible'));
  }, tour);
  await sleep(2400);
}

function targetLocator(page, target) {
  if (!target) return page.locator('main h1, main h2, [role="main"] h1, [role="main"] h2').first();
  if (target.type === 'heading') return page.getByRole('heading', { name: target.name, exact: false }).first();
  if (target.type === 'button') return page.getByRole('button', { name: target.name, exact: false }).first();
  if (target.type === 'link') return page.getByRole('link', { name: target.name, exact: false }).first();
  if (target.type === 'placeholder') return page.getByPlaceholder(target.name, { exact: false }).first();
  if (target.type === 'text') return page.getByText(target.name, { exact: false }).first();
  return page.locator(target.selector || 'main h1, main h2').first();
}

async function safePointTo(page, target, { click = false } = {}) {
  let locator = targetLocator(page, target);
  const available = await locator.count().catch(() => 0);
  if (!available) locator = targetLocator(page);
  await locator.waitFor({ state: 'visible', timeout: 5000 }).catch(() => {});
  try {
    await pointTo(page, locator, { padding: 7, click });
  } catch {
    const fallback = page.locator('main h1, main h2, [role="main"] h1, [role="main"] h2').first();
    if (await fallback.count()) await pointTo(page, fallback, { padding: 7 }).catch(() => {});
  }
}

async function record(name, run, setup) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: VIEWPORT,
    recordVideo: { dir: RAW_DIR, size: VIEWPORT },
    locale: 'tr-TR',
    timezoneId: 'Europe/Istanbul',
    reducedMotion: 'reduce',
  });
  if (setup) await setup(context);
  const page = await context.newPage();
  const video = page.video();
  try {
    await run(page);
    await sleep(1200);
  } finally {
    await context.close();
    await browser.close();
  }
  const source = await video.path();
  const target = path.join(OUTPUT_DIR, `${name}.webm`);
  const publicTarget = path.join(PUBLIC_VIDEO_DIR, `${name}.webm`);
  await copyFile(source, target);
  await copyFile(source, publicTarget);
  await unlink(source).catch(() => {});
  return target;
}

async function getAuthState(role) {
  if (authStateCache.has(role)) return authStateCache.get(role);
  const account = ACCOUNT_BY_ROLE[role];
  const response = await fetch(`${BASE_URL}/api/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(account),
  });
  if (!response.ok) {
    throw new Error(`${role} demo oturumu hazırlanamadı: ${response.status} ${await response.text()}`);
  }
  const payload = await response.json();
  const auth = payload.data;
  const state = {
    user: auth.user,
    accessToken: auth.accessToken,
    isAuthenticated: true,
    completedOnboardingIds: auth.user.onboardingCompleted ? [auth.user.id] : [],
  };
  authStateCache.set(role, state);
  return state;
}

function prepareRoleContext(role) {
  return async (context) => {
    const state = await getAuthState(role);
    await context.addInitScript((state) => {
      localStorage.setItem('auth-storage', JSON.stringify({ state, version: 0 }));
    }, state);
  };
}

async function prepareAuthenticatedContext(context) {
  await prepareRoleContext('parent')(context);
}

async function recordPublicTour() {
  return record('01-platforma-genel-bakis', async (page) => {
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    const tour = { series: 'Genel', index: 'Video 01', title: 'Platforma Genel Bakış', description: 'Platformun aile, uzman ve güvenlik araçlarını kısa bir turla keşfedin.', pathLabel: 'Tanıtım → Güven Merkezi' };
    await showIntro(page, tour);
    await hideStage(page);
    await caption(page, '1 / 4', 'Otizm Destek Platformu', 'Aileler çocuk gelişimini takip eder, uzmanlarla iletişim kurar ve güvenilir kaynaklara tek yerden ulaşır.', 4300);
    const familyCta = page.getByRole('link', { name: 'Ücretsiz aile hesabı oluştur' }).first();
    await pointTo(page, familyCta);
    await caption(page, '2 / 4', 'Aile hesabıyla başlayın', 'Ücretsiz aile hesabı açarak çocuk profili, günlük takip ve randevu araçlarını kullanabilirsiniz.', 3800);
    const expertFeature = page.getByText('Uzmanla güvenli iletişim kurun', { exact: true }).first();
    await scrollTo(page, expertFeature);
    await pointTo(page, expertFeature);
    await caption(page, '3 / 4', 'Takip ve iletişim bir arada', 'Mesajlar, randevular ve paylaşım izinleri aile ile uzman arasındaki süreci düzenli tutar.', 3800);
    const trustLink = page.getByRole('link', { name: /Güven merkezini aç/ }).first();
    await pointTo(page, trustLink, { click: true });
    await page.waitForURL(/guven-merkezi/);
    await page.waitForLoadState('networkidle');
    await caption(page, '4 / 4', 'Gizlilik kontrolleri sizde', 'Güven Merkezi; veri paylaşımı, dışa aktarma, hesap silme ve uzman doğrulama süreçlerini açıklar.', 4800);
    await showOutro(page, { ...tour, outro: 'Hesap türünüzü seçip platformu güvenli biçimde kullanmaya başlayabilirsiniz.' });
  });
}

async function recordParentQuickStart() {
  return record('02-ebeveyn-hizli-baslangic', async (page) => {
    await page.goto(`${BASE_URL}/giris`, { waitUntil: 'networkidle' });
    const tour = { series: 'Aile Başlangıç', index: 'Video 02', title: 'Ebeveyn Hızlı Başlangıç', description: 'Giriş yapın, çocuk profilini hazırlayın ve ilk günlük kayda ulaşın.', pathLabel: 'Giriş → İlk Kurulum → Günlük Takip' };
    await showIntro(page, tour);
    await hideStage(page);
    await caption(page, '1 / 7', 'Ebeveyn hızlı başlangıç', 'Hesabınıza e-posta ve şifrenizle giriş yapın.', 2600);
    await typeInto(page, page.getByLabel('E-posta'), ONBOARDING_EMAIL);
    await typeInto(page, page.getByLabel('Şifre', { exact: true }), DEMO_PASSWORD);
    await pointTo(page, page.getByRole('button', { name: 'Giriş Yap' }), { click: true });
    await page.waitForURL(/\/(baslangic|anasayfa)/, { timeout: 20_000 });
    await page.waitForLoadState('networkidle');

    if (page.url().includes('/baslangic')) {
      await caption(page, '2 / 7', 'İlk kurulum yaklaşık bir dakika', 'Çocuk profilinde yalnızca ad zorunludur; diğer bilgileri daha sonra da tamamlayabilirsiniz.', 3200);
      await pointTo(page, page.getByRole('button', { name: /Başlayalım/ }), { click: true });
      await typeInto(page, page.getByLabel('Çocuğun adı'), 'Deniz');
      const birthDate = page.getByLabel('Doğum tarihi (isteğe bağlı)');
      await pointTo(page, birthDate, { click: true });
      await birthDate.fill('2019-04-12');
      await caption(page, '3 / 7', 'Temel profil bilgileri', 'Doğum tarihi ve diğer ayrıntılar isteğe bağlıdır. Bilgileri daha sonra “Çocuğumun Bilgileri” sayfasından güncelleyebilirsiniz.', 3500);
      await pointTo(page, page.getByRole('button', { name: /Devam et/ }), { click: true });
      await page.getByRole('button', { name: /Şimdilik atla|Devam et/ }).waitFor({ state: 'visible' });
      await caption(page, '4 / 7', 'Destek alanlarını seçin veya atlayın', 'İletişim, duyusal ihtiyaçlar ve davranış gibi alanlar önerileri kişiselleştirmeye yardımcı olur.', 3200);
      await pointTo(page, page.getByRole('button', { name: /Şimdilik atla|Devam et/ }), { click: true });
      await page.getByRole('button', { name: 'Günlük kayıt ekle' }).waitFor({ state: 'visible' });
      await caption(page, '5 / 7', 'Profil hazır', 'İlk iş olarak kısa bir günlük kayıt girelim.', 2600);
      await pointTo(page, page.getByRole('button', { name: 'Günlük kayıt ekle' }), { click: true });
    } else {
      await page.goto(`${BASE_URL}/gunluk-takip`, { waitUntil: 'networkidle' });
    }

    await page.getByRole('heading', { name: 'Bugün nasıldı?' }).waitFor({ state: 'visible' });
    await caption(page, '6 / 7', 'Günlük takip kısa tutulur', 'Bir duygu seçmek bile yeterli bir başlangıçtır. Tetikleyici ve not alanları isteğe bağlıdır.', 3500);
    const mood = page.getByRole('button', { name: /İyi/ }).first();
    await pointTo(page, mood, { click: true });
    const trigger = page.getByRole('button', { name: 'Rutin Değişikliği' });
    await pointTo(page, trigger, { click: true });
    const save = page.getByRole('button', { name: 'Kaydet', exact: true }).first();
    await pointTo(page, save, { click: true });
    await caption(page, '7 / 7', 'Kayıt tamamlandı', 'Düzenli kayıtlar “Nasıl İlerliyoruz?” sayfasında eğilim ve grafiklere dönüşür.', 4500);
    await showOutro(page, { ...tour, outro: 'Çocuk profiliniz hazır. Artık günlük kayıt, randevu ve gelişim araçlarını kullanabilirsiniz.' });
  });
}

async function recordGuideTour() {
  return record('03-kullanici-rehberi', async (page) => {
    await page.goto(`${BASE_URL}/kullanici-rehberi`, { waitUntil: 'networkidle' });
    await page.getByRole('heading', { level: 1, name: 'Kullanıcı Rehberi' }).waitFor({ state: 'visible' });
    const tour = { series: 'Genel', index: 'Video 03', title: 'Kullanıcı Rehberini Kullanma', description: 'Aradığınız sayfayı, işlemi veya destek konusunu birkaç saniyede bulun.', pathLabel: 'Destek & Rehber → Kullanıcı Rehberi' };
    await showIntro(page, tour);
    await hideStage(page);
    await caption(page, '1 / 4', 'Aradığınız özelliği kolayca bulun', 'Kullanıcı Rehberi, hesabınızın rolüne uygun sayfaları ve ilk adımları tek yerde toplar.', 3800);
    const search = page.getByPlaceholder('Sayfa, konu veya işlem ara...');
    await typeInto(page, search, 'randevu');
    await caption(page, '2 / 4', 'Konuya göre arayın', 'Örneğin “randevu” yazarak ilgili tüm sayfaları ve hangi durumda kullanılacağını görebilirsiniz.', 3500);
    const result = page.getByText('Doktor & Terapi', { exact: true }).first();
    await pointTo(page, result);
    await caption(page, '3 / 4', 'Kartlar ne zaman kullanacağınızı açıklar', 'Her kart sayfanın amacını, kullanım zamanını ve doğrudan geçiş bağlantısını gösterir.', 3500);
    await search.fill('kriz');
    await sleep(900);
    const crisis = page.getByText('Zor Anlarda Ne Yapmalı?', { exact: true }).first();
    await pointTo(page, crisis);
    await caption(page, '4 / 4', 'Acil destek sayfaları da burada', 'Zor an rehberi gibi hızlı destek araçlarına menüden veya rehber aramasından ulaşabilirsiniz.', 4500);
    await showOutro(page, { ...tour, outro: 'Bir özelliği bulamadığınızda rehber aramasını kullanarak doğrudan ilgili sayfaya geçebilirsiniz.' });
  }, prepareAuthenticatedContext);
}

const CORE_CAPTION_TRACKS = {
  '01-platforma-genel-bakis': [
    { start: 3.0, end: 7.4, title: 'Otizm Destek Platformu', body: 'Aileler çocuk gelişimini takip eder, uzmanlarla iletişim kurar ve güvenilir kaynaklara tek yerden ulaşır.' },
    { start: 8.0, end: 12.2, title: 'Aile hesabıyla başlayın', body: 'Ücretsiz aile hesabı açarak çocuk profili, günlük takip ve randevu araçlarını kullanabilirsiniz.' },
    { start: 13.3, end: 17.6, title: 'Takip ve iletişim bir arada', body: 'Mesajlar, randevular ve paylaşım izinleri aile ile uzman arasındaki süreci düzenli tutar.' },
    { start: 19.1, end: 24.4, title: 'Gizlilik kontrolleri sizde', body: 'Güven Merkezi; veri paylaşımı, dışa aktarma, hesap silme ve uzman doğrulama süreçlerini açıklar.' },
  ],
  '02-ebeveyn-hizli-baslangic': [
    { start: 3.0, end: 6.2, title: 'Ebeveyn hızlı başlangıç', body: 'Hesabınıza e-posta ve şifrenizle giriş yapın.' },
    { start: 10.0, end: 13.8, title: 'İlk kurulum yaklaşık bir dakika', body: 'Çocuk profilinde yalnızca ad zorunludur; diğer bilgileri daha sonra da tamamlayabilirsiniz.' },
    { start: 15.0, end: 19.0, title: 'Temel profil bilgileri', body: 'Doğum tarihi ve diğer ayrıntılar isteğe bağlıdır.' },
    { start: 20.2, end: 24.0, title: 'Destek alanlarını seçin veya atlayın', body: 'İletişim, duyusal ihtiyaçlar ve davranış gibi alanlar önerileri kişiselleştirmeye yardımcı olur.' },
    { start: 25.1, end: 28.2, title: 'Profil hazır', body: 'İlk iş olarak kısa bir günlük kayıt girelim.' },
    { start: 31.0, end: 36.0, title: 'Günlük takip kısa tutulur', body: 'Bir duygu seçmek bile yeterli bir başlangıçtır. Tetikleyici ve not alanları isteğe bağlıdır.' },
    { start: 43.0, end: 48.5, title: 'Kayıt tamamlandı', body: 'Düzenli kayıtlar “Nasıl İlerliyoruz?” sayfasında eğilim ve grafiklere dönüşür.' },
  ],
  '03-kullanici-rehberi': [
    { start: 3.0, end: 7.2, title: 'Aradığınız özelliği kolayca bulun', body: 'Kullanıcı Rehberi, hesabınızın rolüne uygun sayfaları ve ilk adımları tek yerde toplar.' },
    { start: 9.2, end: 13.3, title: 'Konuya göre arayın', body: 'Örneğin “randevu” yazarak ilgili tüm sayfaları ve hangi durumda kullanılacağını görebilirsiniz.' },
    { start: 14.4, end: 18.5, title: 'Kartlar ne zaman kullanacağınızı açıklar', body: 'Her kart sayfanın amacını, kullanım zamanını ve doğrudan geçiş bağlantısını gösterir.' },
    { start: 20.2, end: 25.2, title: 'Acil destek sayfaları da burada', body: 'Zor an rehberi gibi hızlı destek araçlarına menüden veya rehber aramasından ulaşabilirsiniz.' },
  ],
};

const TOUR_DEFINITIONS = [
  {
    id: '04-ana-sayfa-ve-navigasyon', index: 'Video 04', series: 'Aile', role: 'parent',
    title: 'Ana Sayfa, Menü ve Hızlı Navigasyon',
    description: 'Bugünün işlerini görün; menü, arama, rehber ve yardım araçlarıyla kaybolmadan ilerleyin.',
    pathLabel: 'Ana Sayfa → Arama → Rehber → Yardım',
    outro: 'İhtiyacınız olan sayfaya yan menüden, üst aramadan veya Kullanıcı Rehberi üzerinden ulaşabilirsiniz.',
    chapters: [
      { route: '/anasayfa', target: { type: 'heading', name: 'Bugün ne yapacağım?' }, title: 'Günün merkezi', body: 'Ana sayfa, bugün tamamlanması gereken kayıtları, randevuları ve kısa yolları tek yerde özetler.' },
      { route: '/anasayfa', target: { type: 'button', name: 'Ara veya komut ver' }, title: 'Komut ve sayfa araması', body: 'Üst aramaya yapmak istediğiniz işi yazın; sistem sizi doğru araca yönlendirir.' },
      { route: '/kullanici-rehberi', target: { type: 'heading', name: 'Kullanıcı Rehberi' }, title: 'Tüm özelliklerin haritası', body: 'Menüde görünmeyen takvim, rutin ve topluluk araçlarını da rehberden bulabilirsiniz.' },
      { route: '/yardim', target: { type: 'heading', name: 'Yardım' }, title: 'Sorun yaşadığınızda', body: 'Yardım Merkezi sık sorulan soruları, teknik desteği ve güvenli kullanım bilgilerini toplar.' },
    ],
  },
  {
    id: '05-cocuk-profili', index: 'Video 05', series: 'Aile', role: 'parent',
    title: 'Çocuk Profili ve Bilgileri',
    description: 'Takip araçlarının temelini oluşturan çocuk profilini görüntüleyin, güncelleyin ve uzman erişimini yönetin.',
    pathLabel: 'Çocuğum → Çocuğumun Bilgileri',
    outro: 'Profil güncel olduğunda günlük takip, randevu, hedef ve acil durum araçları daha doğru çalışır.',
    chapters: [
      { route: '/cocuklarim', target: { type: 'heading', name: 'Çocuğumun Bilgileri' }, title: 'Tüm profiller burada', body: 'Çocuğun temel bilgileri, eğitim programı ve terapi notları bu sayfada tutulur.' },
      { route: '/cocuklarim', target: { type: 'button', name: 'Çocuğumu Ekle' }, title: 'Yeni profil ekleme', body: 'Yalnızca ad ile başlayabilir; doğum tarihi, tanı ve terapi ayrıntılarını daha sonra tamamlayabilirsiniz.' },
      { route: '/cocuklarim', target: { type: 'text', name: 'Gelen Uzman İstekleri' }, title: 'Uzman erişimi sizin onayınızda', body: 'Uzmanın çocuk bilgilerine erişme isteğini burada onaylayabilir veya reddedebilirsiniz.' },
      { route: '/cocuklarim', target: { type: 'text', name: 'Deniz' }, title: 'Profil ayrıntısına geçiş', body: 'Profil kartından gelişim, tarama ve ayrıntılı çocuk bilgilerine ulaşabilirsiniz.' },
    ],
  },
  {
    id: '06-gunluk-duygu-ve-uyku', index: 'Video 06', series: 'Aile', role: 'parent',
    title: 'Günlük Duygu ve Uyku Kaydı',
    description: 'Günün duygu durumunu ve uyku kalitesini kısa, sürdürülebilir kayıtlarla takip edin.',
    pathLabel: 'Günlük → Bugünkü Kayıt',
    outro: 'Kısa ama düzenli kayıtlar, gelişim panelindeki haftalık ve aylık eğilimlerin temelidir.',
    chapters: [
      { route: '/gunluk-takip', target: { type: 'heading', name: 'Bugün nasıldı?' }, title: 'Hepsini doldurmak zorunda değilsiniz', body: 'Bir duygu seçmek bile bugünü anlamak için yeterli bir başlangıçtır.' },
      { route: '/gunluk-takip', target: { type: 'heading', name: 'Bugün Nasıl Hissetti?' }, title: 'Duygu ve tetikleyici', body: 'Duygu düzeyini seçin; rutin değişikliği veya duyusal hassasiyet gibi tetikleyicileri isteğe bağlı ekleyin.' },
      { route: '/gunluk-takip', target: { type: 'button', name: 'Uyku' }, title: 'Uyku sekmesine geçin', body: 'Yatış, uyanış, gece uyanma sayısı ve uyku kalitesi aynı günlük akışta tutulur.' },
      { route: '/gunluk-takip', target: { type: 'text', name: 'Haftalık Ortalama Uyku' }, title: 'Haftalık özet', body: 'Önceki kayıtlar, tekrar eden uyku ve duygu örüntülerini fark etmenize yardımcı olur.' },
    ],
  },
  {
    id: '07-ilac-takibi', index: 'Video 07', series: 'Aile', role: 'parent',
    title: 'İlaç, Doz ve Yan Etki Takibi',
    description: 'Doktor önerisiyle kullanılan ilaç ve takviyelerin saatlerini, dozlarını ve gözlemlerinizi kaydedin.',
    pathLabel: 'Günlük → Bugünkü Kayıt → İlaç',
    outro: 'Bu alan yalnızca kayıt ve hatırlatma içindir; doz değişikliği ve tedavi kararları doktorla verilmelidir.',
    chapters: [
      { route: '/gunluk-takip', target: { type: 'button', name: 'İlaç' }, title: 'İlaç sekmesi', body: 'Aktif ilaçları, planlanan saatleri ve gün içindeki alınma durumunu burada görürsünüz.' },
      { route: '/gunluk-takip', target: { type: 'text', name: 'Omega-3 (Video Demo)' }, title: 'Planlı kullanım kartı', body: 'İlaç adı, doz, saat ve stok bilgisi tek kartta takip edilir.' },
      { route: '/gunluk-takip', target: { type: 'button', name: 'İlaç Ekle' }, title: 'Yeni kayıt ekleme', body: 'İlaç veya takviyeyi doktorunuzun verdiği bilgilerle kaydedin; özel talimatı not alanına ekleyin.' },
      { route: '/gunluk-takip', target: { type: 'text', name: 'İlaç güvenliği' }, title: 'Tıbbi güvenlik', body: 'Platform bir tedavi kararı vermez; yalnızca düzenli kayıt ve hatırlatma sağlar.' },
    ],
  },
  {
    id: '08-gelisim-paneli', index: 'Video 08', series: 'Aile', role: 'parent',
    title: 'Nasıl İlerliyoruz? Gelişim Paneli',
    description: 'Günlük kayıtları grafik, eğilim ve paylaşılabilir gelişim özetlerine dönüştürün.',
    pathLabel: 'Çocuğum → Nasıl İlerliyoruz?',
    outro: 'Grafikleri tek bir güne göre değil, düzenli kayıtların oluşturduğu genel eğilime göre değerlendirin.',
    chapters: [
      { route: '/gelisim-paneli', target: { type: 'heading', name: 'Nasıl İlerliyoruz?' }, title: 'Büyük resmi görün', body: 'Duygu, uyku, not, randevu ve kilometre taşı kayıtları ortak bir gelişim görünümünde birleşir.' },
      { route: '/gelisim-paneli', target: { type: 'text', name: 'Takip Özeti' }, title: 'Takip özeti', body: 'Kayıt düzeni ve son dönemdeki değişimler hızlı bir özetle gösterilir.' },
      { route: '/gelisim-paneli', target: { type: 'text', name: 'Ruh Hali Trendi' }, title: 'Grafikleri karşılaştırın', body: '7, 30 veya 90 günlük aralıklarda duygu ve uyku eğilimlerini birlikte okuyabilirsiniz.' },
      { route: '/gelisim-paneli', target: { selector: '[title="PDF / Yazdır"]' }, title: 'Uzman görüşmesine hazırlık', body: 'Gelişim özetini PDF veya CSV olarak dışa aktarıp görüşme öncesinde hazırlayabilirsiniz.' },
    ],
  },
  {
    id: '09-hedefler-ve-egzersizler', index: 'Video 09', series: 'Aile', role: 'parent',
    title: 'Hedefler ve Ev Egzersizleri',
    description: 'Bugünün planını, kısa ev oyunlarını ve küçük gelişim hedeflerini tek çalışma alanında yönetin.',
    pathLabel: 'Çocuğum → Hedefler ve Egzersizler',
    outro: 'Küçük ve ölçülebilir hedefler seçin; çocuğun zorlandığı günlerde süreyi kısaltabilirsiniz.',
    chapters: [
      { route: '/tedavi', target: { selector: 'main h1' }, title: 'Günlük çalışma alanı', body: 'Bu sayfa tıbbi tedavi yerine evde uygulanabilecek hedef ve destek çalışmalarını düzenler.' },
      { route: '/tedavi', target: { type: 'text', name: '1. Bugünün Planı' }, title: 'Bugünün planı', body: 'O gün yapılacak kısa çalışmaları seçerek yorucu olmayan bir rutin oluşturun.' },
      { route: '/tedavi', target: { type: 'text', name: '2. Ev Oyunları & Egzersiz' }, title: 'Oyunla destek', body: 'İletişim, motor ve duyusal becerileri destekleyen ev etkinliklerini inceleyin.' },
      { route: '/tedavi', target: { type: 'text', name: '3. Gelişim Hedefleri' }, title: 'Ölçülebilir hedefler', body: 'Küçük hedefler ekleyip ilerlemeyi düzenli işaretleyebilirsiniz.' },
      { route: '/tedavi', target: { type: 'text', name: '4. Yardımcı Araçlar' }, title: 'Görsel destek araçları', body: 'Sosyal hikâye ve görsel materyalleri günlük çalışmaya yardımcı olarak kullanın.' },
    ],
  },
  {
    id: '10-odevler-ve-rutinler', index: 'Video 10', series: 'Aile', role: 'parent',
    title: 'Uzman Ödevleri ve Görsel Rutinler',
    description: 'Uzmanın verdiği ev çalışmalarını tamamlayın ve günlük rutinleri görsel adımlara ayırın.',
    pathLabel: 'Çocuğum → Ödevler / Rutinler',
    outro: 'Ödev uzmanla takip içindir; rutin ise evdeki tekrar eden işleri öngörülebilir hale getirir.',
    chapters: [
      { route: '/gorevler', target: { type: 'heading', name: 'Ödevlerim' }, title: 'Uzmandan gelen çalışmalar', body: 'Görev açıklaması, son tarih ve yapılma biçimi uzman tarafından bu alanda paylaşılır.' },
      { route: '/gorevler', target: { type: 'text', name: 'Video Demo:' }, title: 'Görevi tamamlayıp bildirin', body: 'Çalışma sonrası kısa not veya kanıt ekleyerek uzmana geri bildirim gönderebilirsiniz.' },
      { route: '/rutinler', target: { type: 'heading', name: 'Rutin Yönetimi' }, title: 'Tekrarlanan işleri görselleştirin', body: 'Sabah, okul ve uyku rutinlerini küçük ve anlaşılır adımlara ayırın.' },
      { route: '/rutinler', target: { type: 'text', name: 'Sabah Rutini (Video Demo)' }, title: 'Adımları sırayla takip edin', body: 'Tamamlanan her adımı işaretleyerek geçişleri daha öngörülebilir hale getirebilirsiniz.' },
    ],
  },
  {
    id: '11-notlar-takvim-acil-kart', index: 'Video 11', series: 'Aile', role: 'parent',
    title: 'Notlar, Takvim ve Acil Durum Kartı',
    description: 'Önemli gözlemleri kaydedin, tarihli planları yönetin ve acil bilgileri önceden hazırlayın.',
    pathLabel: 'Çocuğum → Notlar / Takvim / Acil Kart',
    outro: 'Notlar geçmişi anlamaya, takvim planlamaya, acil kart ise gerektiğinde hızlı bilgi paylaşmaya yarar.',
    chapters: [
      { route: '/notlar', target: { type: 'heading', name: 'Notlarım' }, title: 'Gözlemleri unutmayın', body: 'Davranış, gelişim veya terapi sonrası fark ettiğiniz ayrıntıları kısa not olarak saklayın.' },
      { route: '/notlar', target: { type: 'button', name: 'Not Ekle' }, title: 'Kategori ve ruh hali ekleyin', body: 'Notları kategori, tarih ve ruh haliyle düzenleyerek sonra kolayca arayabilirsiniz.' },
      { route: '/takvim', target: { type: 'heading', name: 'Takvim' }, title: 'Tarihli planlar', body: 'Randevu, terapi, okul ve özel etkinlikleri renkli hatırlatmalarla planlayın.' },
      { route: '/acil-kart', target: { type: 'heading', name: 'Acil Durum Kartım' }, title: 'Acil bilgileri önceden hazırlayın', body: 'İletişim, tetikleyici ve sakinleştirme bilgilerini yazdırılabilir bir kartta tutun.' },
      { route: '/acil-kart', target: { type: 'button', name: 'Kartı Yazdır' }, title: 'Yanınızda taşıyın', body: 'Kartı yazdırabilir veya açık rıza verdiğinizde QR bağlantısıyla paylaşabilirsiniz.' },
    ],
  },
  {
    id: '12-uzman-bulma-ve-randevu', index: 'Video 12', series: 'Aile', role: 'parent',
    title: 'Uzman Bulma ve Randevu Planlama',
    description: 'Doğrulanmış uzmanları inceleyin, uygun görüşme biçimini seçin ve randevu talebini takip edin.',
    pathLabel: 'Destek → Uzmanlar / Doktor & Terapi',
    outro: 'Uzmanın unvanını, doğrulama durumunu ve çalışma biçimini inceleyip size uygun randevu talebini oluşturabilirsiniz.',
    chapters: [
      { route: '/uzmanlar', target: { selector: 'main h1' }, title: 'Uzman dizini', body: 'Uzmanlık, şehir, çevrim içi görüşme ve yeni danışan kabulü gibi ölçütlerle arama yapın.' },
      { route: '/uzmanlar', target: { type: 'text', name: 'Uzm. Dr. Selin Kaya' }, title: 'Doğrulanmış profili inceleyin', body: 'Unvan, kurum, uzmanlık alanı ve görüşme seçeneklerini profil kartında görebilirsiniz.' },
      { route: '/randevular', target: { selector: 'main h1' }, title: 'Talepler ve yaklaşan görüşmeler', body: 'Bekleyen, onaylanan ve tamamlanan randevular aynı çalışma alanında izlenir.' },
      { route: '/randevular', target: { type: 'text', name: 'Video Demo:' }, title: 'Görüşme ayrıntısı', body: 'Tarih, saat, görüşme tipi ve konu bilgisi randevu kartında açıkça gösterilir.' },
    ],
  },
  {
    id: '13-mesajlar-gizlilik-ayarlar', index: 'Video 13', series: 'Aile', role: 'parent',
    title: 'Mesajlar, Paylaşım İzinleri ve Ayarlar',
    description: 'Uzmanla güvenli iletişim kurun ve hangi çocuk bilgisinin kimlerle paylaşılacağını kontrol edin.',
    pathLabel: 'Günlük → Mesajlar / Ayarlar',
    outro: 'Mesajlaşma ve veri paylaşımı ayrı izinlerdir; ayarlardan her birini istediğiniz zaman değiştirebilirsiniz.',
    chapters: [
      { route: '/mesajlar', target: { type: 'heading', name: 'Mesajlar' }, title: 'Güvenli yazışma alanı', body: 'Uzman ve platform bağlantılarıyla yapılan konuşmalar hesabınız içinde düzenli tutulur.' },
      { route: '/mesajlar', target: { type: 'button', name: 'Yeni Mesaj' }, title: 'Yeni konuşma başlatın', body: 'İsim veya e-posta ile doğru kişiyi bulup yeni konuşma açabilirsiniz.' },
      { route: '/ayarlar', target: { type: 'heading', name: 'Ayarlar' }, title: 'Hesap tercihleri', body: 'Profil, bildirim, görünüm, erişilebilirlik ve gizlilik seçenekleri bu sayfada toplanır.' },
      { route: '/ayarlar', target: { type: 'text', name: 'Gizlilik' }, title: 'Paylaşımı kontrol edin', body: 'Uzmanın görebileceği gelişim notlarını ve iletişim tercihlerini açık biçimde yönetebilirsiniz.' },
    ],
  },
  {
    id: '14-topluluk-forum-bulusmalar', index: 'Video 14', series: 'Aile', role: 'parent',
    title: 'Topluluk, Forum ve Yerel Buluşmalar',
    description: 'Diğer ailelerle deneyim paylaşın, soru sorun, benzer aileleri bulun ve güvenli buluşmalar planlayın.',
    pathLabel: 'Topluluk → Merkez / Forum / Buluşmalar',
    outro: 'Topluluk alanlarında kişisel sağlık bilgilerini paylaşmadan, saygılı ve güvenli iletişim kurun.',
    chapters: [
      { route: '/topluluk', target: { selector: 'main h1' }, title: 'Topluluk Merkezi', body: 'Forum, gruplar, benzer aileler ve buluşmalar arasındaki farkı bu merkezden görebilirsiniz.' },
      { route: '/forum', target: { type: 'heading', name: 'Forum' }, title: 'Soru ve deneyim paylaşımı', body: 'Topluluğa soru sorabilir, deneyimleri okuyabilir ve yararlı yanıtları destekleyebilirsiniz.' },
      { route: '/dertlesme-duvari', target: { selector: 'main h1' }, title: 'Dertleşme Duvarı', body: 'Soru sormaktan çok duygu ve deneyim paylaşmak istediğinizde bu destek alanını kullanın.' },
      { route: '/benzer-aileler', target: { selector: 'main h1' }, title: 'Benzer aileler', body: 'Yaklaşık konum ve ortak destek alanlarına göre gönüllü bağlantılar keşfedebilirsiniz.' },
      { route: '/bulusmalar', target: { type: 'heading', name: 'Yerel Buluşmalar' }, title: 'Şehrinizde buluşma', body: 'Mevcut bir etkinliğe katılabilir veya herkesin görebileceği yeni bir buluşma planlayabilirsiniz.' },
      { route: '/haftalik-soru', target: { type: 'text', name: 'Haftanın Sorusu' }, title: 'Haftalık ortak konu', body: 'Her hafta belirlenen konuya yanıt verip farklı ailelerin deneyimlerini okuyabilirsiniz.' },
    ],
  },
  {
    id: '15-bilgi-bankasi-kriz-yardim', index: 'Video 15', series: 'Aile', role: 'parent',
    title: 'Bilgi Bankası, Zor An Rehberi ve Yardım',
    description: 'Güvenilir kaynaklara ulaşın, zor anlarda sakin adımları izleyin ve teknik destek bulun.',
    pathLabel: 'Topluluk → Bilgi Bankası / Zor An / Yardım',
    outro: 'Bilgi içerikleri ve kriz adımları profesyonel sağlık hizmetinin yerine geçmez; acil durumda 112 aranmalıdır.',
    chapters: [
      { route: '/bilgi-bankasi', target: { type: 'heading', name: 'Bilgi Bankası' }, title: 'Güvenilir içerik arayın', body: 'Konu, kategori ve içerik türüne göre yayınlanmış kaynakları inceleyebilirsiniz.' },
      { route: '/bilgi-bankasi', target: { type: 'placeholder', name: 'İçeriklerde ara' }, title: 'İhtiyacınız olan konuyu bulun', body: 'Uyku, iletişim veya okul gibi bir kelime yazarak ilgili kaynakları filtreleyin.' },
      { route: '/kriz-rehberi', target: { type: 'heading', name: 'Zor Anlarda Ne Yapmalı?' }, title: 'Sakin ve adım adım yönlendirme', body: 'Kriz, duyusal yüklenme ve yoğun kaygı durumlarında yapılabilecekleri hızlıca açın.' },
      { route: '/kriz-rehberi', target: { type: 'text', name: 'Kriz / Meltdown' }, title: 'Duruma uygun kart', body: 'Belirtileri, yapılacakları ve kaçınılması gerekenleri durum kartından okuyabilirsiniz.' },
      { route: '/yardim', target: { type: 'heading', name: 'Yardım' }, title: 'Teknik destek ve SSS', body: 'Bir özelliği bulamadığınızda yardım içeriklerine ve destek kanalına ulaşın.' },
    ],
  },
  {
    id: '16-uzman-ana-sayfa-danisanlar', index: 'Video 16', series: 'Uzman', role: 'expert',
    title: 'Uzman Ana Sayfası ve Danışanlar',
    description: 'Günün klinik işlerini okuyun, aktif danışanları inceleyin ve güvenli erişim sürecini yönetin.',
    pathLabel: 'Uzman → Ana Sayfa / Danışanlarım',
    outro: 'Uzman yalnızca onaylı bağlantısı veya geçerli randevusu bulunan danışan verilerine erişebilir.',
    chapters: [
      { route: '/anasayfa', target: { type: 'text', name: 'Bugünkü Çalışma Odağı' }, title: 'Günün klinik özeti', body: 'Randevu, bekleyen iş, okunmamış mesaj ve profil uyarıları ana sayfada önceliklendirilir.' },
      { route: '/anasayfa', target: { type: 'text', name: 'Aktif Danışan' }, title: 'Hızlı durum göstergeleri', body: 'Aktif danışan ve yaklaşan görüşme sayılarını tek bakışta görebilirsiniz.' },
      { route: '/danisanlarim', target: { type: 'heading', name: 'Danışanlarım' }, title: 'Danışan çalışma alanı', body: 'Bağlantılı çocukları seçip not, görev, rapor ve iletişim araçlarına ulaşın.' },
      { route: '/danisanlarim', target: { type: 'text', name: 'Deniz' }, title: 'Yetkili çocuk profili', body: 'Danışan kartı yalnızca ailenin onayladığı erişim kapsamında gösterilir.' },
      { route: '/danisanlarim', target: { type: 'button', name: 'Danışan Ekle' }, title: 'Yeni bağlantı isteği', body: 'Veli e-postasıyla erişim isteği gönderilir; aile onaylamadan çocuk verisi açılmaz.' },
    ],
  },
  {
    id: '17-uzman-randevu-takvimi', index: 'Video 17', series: 'Uzman', role: 'expert',
    title: 'Uzman Randevu ve Çalışma Saatleri',
    description: 'Müsaitlik planını oluşturun, bekleyen talepleri yönetin ve görüşme durumlarını takip edin.',
    pathLabel: 'Uzman → Randevularım',
    outro: 'Çalışma saatleri ailelerin görebileceği uygun zamanları belirler; talepler ayrıca uzman onayından geçer.',
    chapters: [
      { route: '/randevular', target: { selector: 'main h1' }, title: 'Randevu takvimi', body: 'Yaklaşan, bekleyen ve tamamlanan görüşmeler uzman görünümünde birlikte yönetilir.' },
      { route: '/randevular', target: { type: 'text', name: 'Çalışma Saatlerim' }, title: 'Müsaitlik planı', body: 'Haftanın açık günlerini ve görüşme saat aralıklarını buradan tanımlayın.' },
      { route: '/randevular', target: { type: 'text', name: 'Bekleyen' }, title: 'Talepleri sonuçlandırın', body: 'Ailenin gönderdiği talebi onaylayabilir, reddedebilir veya uygun zamana yeniden planlayabilirsiniz.' },
      { route: '/randevular', target: { type: 'text', name: 'Video Demo:' }, title: 'Görüşme ayrıntıları', body: 'Konu, çocuk, görüşme biçimi ve tarih bilgisi her randevu kartında yer alır.' },
    ],
  },
  {
    id: '18-uzman-gorev-ve-ev-plani', index: 'Video 18', series: 'Uzman', role: 'expert',
    title: 'Danışana Görev ve Ev Planı Verme',
    description: 'Danışan kartından ölçülebilir ev çalışmaları atayın ve aile teslimlerini değerlendirin.',
    pathLabel: 'Uzman → Danışanlarım → Görevler',
    outro: 'Görevi kısa, açık ve ölçülebilir yazın; aile geri bildirimini bir sonraki seans planında kullanın.',
    chapters: [
      { route: '/danisanlarim', target: { type: 'heading', name: 'Danışanlarım' }, title: 'Önce danışanı seçin', body: 'Görev ve klinik notlar doğru çocuk profili üzerinden oluşturulur.' },
      { route: '/danisanlarim', target: { type: 'text', name: 'Deniz' }, click: true, title: 'Danışan ayrıntısını açın', body: 'Danışan seçildiğinde görev, not, rapor ve mesaj seçenekleri görünür.' },
      { route: '/danisanlarim', target: { type: 'text', name: 'Görevler & Ev Ödevleri' }, title: 'Görev takibi', body: 'Bekleyen, tamamlanan ve geciken çalışmalar aynı bölümde izlenir.' },
      { route: '/danisanlarim', target: { type: 'button', name: 'Yeni Görev' }, title: 'Yeni ev çalışması', body: 'Başlık, adımlar, sıklık, zorluk ve son tarih bilgilerini aile için açık biçimde yazın.' },
    ],
  },
  {
    id: '19-bep-raporu', index: 'Video 19', series: 'Uzman', role: 'expert',
    title: 'BEP Raporu Hazırlama',
    description: 'Mevcut performansı yazın, uzun ve kısa dönem hedefleri ekleyin ve yapılandırılmış raporu paylaşın.',
    pathLabel: 'Uzman → BEP Raporu Yaz',
    outro: 'BEP hedeflerini gözlenebilir, ölçülebilir ve aileyle uygulanabilir ifadelerle hazırlayın.',
    chapters: [
      { route: '/bep-raporu', target: { type: 'heading', name: 'BEP Rapor Üretici' }, title: 'Yapılandırılmış rapor akışı', body: 'Öğrenci bilgisi, performans, hedefler ve ilerleme aynı rapor çalışma alanında tutulur.' },
      { route: '/bep-raporu', target: { type: 'text', name: 'Danışan Seçimi' }, title: 'Doğru danışanı seçin', body: 'Raporu hazırlamadan önce onaylı danışan bağlantısını seçin.' },
      { route: '/bep-raporu', target: { type: 'button', name: 'Verilerden Taslak Oluştur' }, title: 'Mevcut veriden başlangıç', body: 'İzin verilen gelişim kayıtlarını performans taslağına dönüştürüp uzman olarak düzenleyebilirsiniz.' },
      { route: '/bep-raporu', target: { type: 'text', name: 'Uzun Dönem Hedef' }, title: 'Hedef ve ölçüt', body: 'Uzun dönem hedefi kısa dönem adımlar, ölçüt, yöntem, materyal ve aile çalışmasıyla somutlaştırın.' },
      { route: '/bep-raporu', target: { type: 'text', name: 'BEP taslağı' }, title: 'Önizleme ve paylaşım', body: 'Taslağı kontrol ettikten sonra yazdırabilir veya aileyle güvenli şekilde paylaşabilirsiniz.' },
    ],
  },
  {
    id: '20-uzman-iletisim-ve-kaynaklar', index: 'Video 20', series: 'Uzman', role: 'expert',
    title: 'Uzman İletişimi, Gruplar ve Kaynaklar',
    description: 'Ailelerle güvenli yazışın, uzman gruplarına katılın ve Bilgi Bankasına kaynak katkısı sunun.',
    pathLabel: 'Uzman → Mesajlar / Gruplar / Bilgi Bankası',
    outro: 'Mesajlarda mahremiyeti koruyun; Bilgi Bankasına eklenen uzman içerikleri yönetici incelemesine gönderilir.',
    chapters: [
      { route: '/mesajlar', target: { type: 'heading', name: 'Mesajlar' }, title: 'Aileyle güvenli iletişim', body: 'Danışan ailesiyle randevu, görev ve takip konularını platform içinde yazışın.' },
      { route: '/gruplar', target: { selector: 'main h1' }, title: 'Uzman ve topluluk grupları', body: 'Ortak çalışma alanlarında ekip iletişimi, duyuru ve toplantı akışlarını yönetebilirsiniz.' },
      { route: '/forum', target: { type: 'heading', name: 'Forum' }, title: 'Uzman yanıtı', body: 'Aile sorularına genel bilgilendirme sunarken kişisel tanı veya tedavi kararı vermeyin.' },
      { route: '/bilgi-bankasi', target: { type: 'heading', name: 'Bilgi Bankası' }, title: 'Kaynak katkısı', body: 'Kaynağı, yazarı ve kullanım hakkı açık olan içerik taslaklarını incelemeye gönderebilirsiniz.' },
      { route: '/ayarlar', target: { type: 'text', name: 'Uzman Profil Bilgileri' }, title: 'Hizmet profilini güncelleyin', body: 'Unvan, kurum, yaş grubu, destek konusu ve görüşme biçimlerini güncel tutun.' },
    ],
  },
  {
    id: '21-yonetim-genel-bakis-analitik', index: 'Video 21', series: 'Yönetici', role: 'admin',
    title: 'Yönetim Paneli ve Analitik',
    description: 'Platform sağlığını, bekleyen işleri, kullanıcı büyümesini ve etkileşim göstergelerini okuyun.',
    pathLabel: 'Yönetim → Genel Bakış / Analitik',
    outro: 'Yönetim özetini günlük operasyon için, analitik ekranını ise dönemsel eğilimleri değerlendirmek için kullanın.',
    chapters: [
      { route: '/admin', target: { type: 'heading', name: 'Otizm Destek Yönetim Paneli' }, title: 'Merkezi kontrol paneli', body: 'Kullanıcı, uzman, içerik ve rapor durumlarını tek ekranda izleyin.' },
      { route: '/admin', target: { type: 'text', name: 'Hızlı Yönetim Aksiyonları' }, title: 'Bekleyen işlere hızlı geçiş', body: 'Uzman başvurusu, içerik incelemesi ve rapor kuyruğuna doğrudan ulaşabilirsiniz.' },
      { route: '/admin/analytics', target: { type: 'text', name: 'Büyüme Analitiği' }, title: 'Dönemsel büyüme', body: '7, 30, 90 gün veya yıllık aralıkta yeni kullanıcı ve kullanım eğilimlerini karşılaştırın.' },
      { route: '/admin/analytics', target: { type: 'text', name: 'Platform Etkileşimi' }, title: 'Etkileşim göstergeleri', body: 'Mesaj, içerik ve topluluk hareketlerini platform geneliyle sınırlı, toplu metrikler olarak okuyun.' },
    ],
  },
  {
    id: '22-uzman-basvurulari-kullanicilar', index: 'Video 22', series: 'Yönetici', role: 'admin',
    title: 'Uzman Başvuruları ve Kullanıcı Yönetimi',
    description: 'Uzman belgelerini inceleyin, başvuruları sonuçlandırın ve kullanıcı hesaplarını güvenli biçimde yönetin.',
    pathLabel: 'Yönetim → Uzmanlar / Kullanıcılar',
    outro: 'Uzman onayında belge ve lisans bilgilerini doğrulayın; ana yönetici hesabında riskli aksiyon uygulamayın.',
    chapters: [
      { route: '/admin/experts', target: { selector: 'main h1, main h2' }, title: 'Uzman başvuru kuyruğu', body: 'Bekleyen, onaylı ve reddedilen uzmanları ayrı durumlarda inceleyin.' },
      { route: '/admin/experts', target: { type: 'text', name: 'Psk. Mert Yılmaz' }, title: 'Belge ve kimlik kontrolü', body: 'Unvan, kurum, lisans numarası ve yüklenen mesleki belgeyi karar öncesinde doğrulayın.' },
      { route: '/admin/users', target: { type: 'placeholder', name: 'İsim veya E-posta' }, title: 'Kullanıcı CRM araması', body: 'İsim, e-posta ve rol filtreleriyle hesabı hızlıca bulun.' },
      { route: '/admin/users', target: { type: 'text', name: 'Video Demo Ailesi' }, title: 'Hesap ayrıntısı', body: 'Rol, aktiflik ve hesap geçmişini inceleyin; engelleme gibi aksiyonları yalnız gerekli olduğunda kullanın.' },
    ],
  },
  {
    id: '23-icerik-ve-moderasyon', index: 'Video 23', series: 'Yönetici', role: 'admin',
    title: 'İçerik Yönetimi ve Moderasyon',
    description: 'Bilgi Bankası içeriklerini kaynak açısından inceleyin ve topluluk raporlarını kanıta dayalı sonuçlandırın.',
    pathLabel: 'Yönetim → İçerik / Moderasyon',
    outro: 'İçerik kararlarında kaynak ve telif kaydını; moderasyonda hedef içeriği ve rapor gerekçesini birlikte değerlendirin.',
    chapters: [
      { route: '/admin/content', target: { type: 'heading', name: 'İçerik Yönetimi' }, title: 'Bilgi Bankası CMS', body: 'Taslak, incelemede ve yayınlanmış içerikleri ortak bir editör ekranında yönetin.' },
      { route: '/admin/content', target: { type: 'button', name: 'Yeni Makale' }, title: 'Kaynak ve editöryal kayıt', body: 'Başlık, kategori, kaynak, lisans ve inceleme notunu eksiksiz tutun.' },
      { route: '/admin/reports', target: { type: 'heading', name: 'Moderasyon' }, title: 'Rapor kuyruğu', body: 'Bekleyen şikâyetleri hedef türü ve gerekçesine göre sıralayın.' },
      { route: '/admin/reports', target: { type: 'text', name: 'Video Demo:' }, title: 'Hedefi görmeden karar vermeyin', body: 'Şikâyet edilen içerik önizlemesini inceleyip uyarı, kaldırma veya göz ardı kararını gerekçelendirin.' },
    ],
  },
  {
    id: '24-aktivite-kaydi-sistem-ayarlari', index: 'Video 24', series: 'Yönetici', role: 'admin',
    title: 'Aktivite Kaydı ve Sistem Ayarları',
    description: 'Yönetim hareketlerini denetleyin, platform yapılandırmasını ve canlı sunucu sağlığını güvenle izleyin.',
    pathLabel: 'Yönetim → Aktivite Kaydı / Ayarlar',
    outro: 'Bakım modu ve sistem geneli ayarlar yüksek etkili işlemlerdir; canlı ortamda yalnız planlı değişiklik süreciyle kullanılmalıdır.',
    chapters: [
      { route: '/admin/auditlog', target: { type: 'heading', name: 'Aktivite Kaydı' }, title: 'Kim, ne zaman, ne yaptı?', body: 'Giriş, randevu, görev ve yönetim hareketlerini denetim kaydından inceleyin.' },
      { route: '/admin/auditlog', target: { type: 'placeholder', name: 'İşlem türü' }, title: 'Filtreleme ve dışa aktarma', body: 'İşlem türü ve tarih aralığıyla kaydı daraltıp gerektiğinde CSV olarak dışa aktarın.' },
      { route: '/admin/settings', target: { type: 'heading', name: 'Sistem ve Platform Ayarları' }, title: 'Platform yapılandırması', body: 'Kayıt, bildirim, yapay zekâ ve yedekleme tercihlerini merkezi olarak yönetin.' },
      { route: '/admin/settings', target: { type: 'text', name: 'Canlı Sunucu Sağlığı' }, title: 'Sunucu sağlığını izleyin', body: 'CPU, bellek ve servis durumunu değişiklik yapmadan gözlemleyebilirsiniz.' },
      { route: '/admin/settings', target: { type: 'text', name: 'Sistem Bakım Modu' }, title: 'Yüksek etkili işlem', body: 'Bakım modunu yalnız planlı çalışma sırasında ve kullanıcı iletişimi tamamlandıktan sonra etkinleştirin.' },
    ],
  },
];

function toVttTimestamp(seconds) {
  const totalMilliseconds = Math.round(seconds * 1000);
  const hours = Math.floor(totalMilliseconds / 3_600_000);
  const minutes = Math.floor((totalMilliseconds % 3_600_000) / 60_000);
  const wholeSeconds = Math.floor((totalMilliseconds % 60_000) / 1000);
  const milliseconds = totalMilliseconds % 1000;
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}:${String(wholeSeconds).padStart(2, '0')}.${String(milliseconds).padStart(3, '0')}`;
}

async function writeVttTrack(videoId, cues) {
  const blocks = cues.map((cue, index) => (
    `${index + 1}\n${toVttTimestamp(cue.start)} --> ${toVttTimestamp(cue.end)}\n${cue.title}\n${cue.body}\n`
  ));
  const vtt = `WEBVTT\n\n${blocks.join('\n')}`;
  await writeFile(path.join(PUBLIC_VIDEO_DIR, `${videoId}.vtt`), vtt, 'utf8');
  await writeFile(path.join(OUTPUT_DIR, `${videoId}.vtt`), vtt, 'utf8');
}

async function recordGenericTour(tour) {
  const output = await record(tour.id, async (page) => {
    let activeRoute = tour.chapters[0].route;
    await goTo(page, activeRoute);
    await showIntro(page, tour);
    await capturePoster(page, tour.id);
    await hideStage(page);

    for (let index = 0; index < tour.chapters.length; index += 1) {
      const chapter = tour.chapters[index];
      if (chapter.route !== activeRoute) {
        activeRoute = chapter.route;
        await goTo(page, activeRoute);
      }
      await safePointTo(page, chapter.target, { click: Boolean(chapter.click) });
      if (chapter.click) await sleep(900);
      await caption(page, `${index + 1} / ${tour.chapters.length}`, chapter.title, chapter.body, 3000);
    }

    await showOutro(page, tour);
  }, prepareRoleContext(tour.role));

  await writeVttTrack(tour.id, tour.chapters.map((chapter, index) => ({
    start: 2.4 + index * 4.55,
    end: 6.5 + index * 4.55,
    title: chapter.title,
    body: chapter.body,
  })));
  return output;
}

await mkdir(RAW_DIR, { recursive: true });
await mkdir(PUBLIC_VIDEO_DIR, { recursive: true });
for (const [videoId, cues] of Object.entries(CORE_CAPTION_TRACKS)) {
  await writeVttTrack(videoId, cues);
  await copyFile(
    path.join(PUBLIC_VIDEO_DIR, `${videoId}.svg`),
    path.join(OUTPUT_DIR, `${videoId}.svg`),
  ).catch(() => {});
}
const requested = process.argv.slice(2);
const all = requested.length === 0 || requested.includes('all');
const selected = new Set(requested);
const outputs = [];

if (all || selected.has('public') || selected.has('general')) outputs.push(await recordPublicTour());
if (all || selected.has('parent') || selected.has('onboarding')) outputs.push(await recordParentQuickStart());
if (all || selected.has('guide') || selected.has('general')) outputs.push(await recordGuideTour());

for (const tour of TOUR_DEFINITIONS) {
  const shouldRecord = all || selected.has('library') || selected.has(tour.role) || selected.has(tour.id);
  if (shouldRecord) outputs.push(await recordGenericTour(tour));
}

if (selected.has('publish')) {
  for (const name of VIDEO_NAMES) {
    const source = path.join(OUTPUT_DIR, `${name}.webm`);
    const target = path.join(PUBLIC_VIDEO_DIR, `${name}.webm`);
    await copyFile(source, target);
    await copyFile(path.join(OUTPUT_DIR, `${name}.png`), path.join(PUBLIC_VIDEO_DIR, `${name}.png`)).catch(() => {});
    await copyFile(path.join(OUTPUT_DIR, `${name}.vtt`), path.join(PUBLIC_VIDEO_DIR, `${name}.vtt`)).catch(() => {});
    outputs.push(target);
  }
}

const coreTranscript = [
  ['01 — Platforma Genel Bakış', 'Aileler çocuk gelişimini takip eder, uzmanlarla iletişim kurar ve güvenilir kaynaklara tek yerden ulaşır. Gizlilik ve veri kontrolleri Güven Merkezi’nde açıklanır.'],
  ['02 — Ebeveyn Hızlı Başlangıç', 'Giriş yaptıktan sonra çocuk profili oluşturulur. Destek alanları isteğe bağlıdır. Günlük takipte bir duygu seçmek yeterli bir başlangıçtır.'],
  ['03 — Kullanıcı Rehberi', 'Rehberde konu veya işlem aratılarak ilgili sayfalar bulunur. Her kart özelliğin amacını ve ne zaman kullanılacağını açıklar.'],
];
const transcriptSections = [
  ...coreTranscript.map(([title, text]) => `## ${title}\n\n${text}`),
  ...TOUR_DEFINITIONS.map((tour) => {
    const chapters = tour.chapters.map((chapter, index) => `${index + 1}. **${chapter.title}:** ${chapter.body}`).join('\n');
    return `## ${tour.index.replace('Video ', '')} — ${tour.title}\n\n${tour.description}\n\n${chapters}`;
  }),
];
const transcript = `# Otizm Destek Platformu — Video Metinleri\n\n${transcriptSections.join('\n\n')}\n`;
await writeFile(path.join(OUTPUT_DIR, 'video-metinleri.md'), transcript, 'utf8');

console.log(`Hazır:\n${outputs.map((item) => `- ${item}`).join('\n')}`);
