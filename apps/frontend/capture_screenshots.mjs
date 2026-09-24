import puppeteer from 'puppeteer-core';
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../..');
const frontendDir = __dirname;
const screenshotsDir = path.resolve(rootDir, '_docs/screenshots');

if (!fs.existsSync(screenshotsDir)) {
  fs.mkdirSync(screenshotsDir, { recursive: true });
}

const CHROME_PATH = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 5199;
const BASE_URL = `http://localhost:${PORT}`;

async function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function waitForServer(url, timeoutMs = 20000) {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.ok) return true;
    } catch {
      // ignore
    }
    await sleep(400);
  }
  throw new Error(`Server at ${url} did not start within ${timeoutMs}ms`);
}

async function main() {
  console.log('🚀 Starting Vite frontend in Mock Mode on port', PORT);

  const vite = spawn('npx', ['vite', '--port', String(PORT), '--strictPort'], {
    cwd: frontendDir,
    env: { ...process.env, VITE_USE_MOCK: 'true', VITE_ENABLE_DEMO: 'true' },
    stdio: 'pipe',
  });

  vite.stdout.on('data', (d) => process.stdout.write(`[vite] ${d}`));
  vite.stderr.on('data', (d) => process.stderr.write(`[vite err] ${d}`));

  try {
    await waitForServer(BASE_URL);
    console.log('✅ Vite server is ready at', BASE_URL);

    console.log('🌐 Launching headless Chrome from', CHROME_PATH);
    const browser = await puppeteer.launch({
      executablePath: CHROME_PATH,
      headless: true,
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-gpu',
        '--window-size=1440,900',
      ],
    });

    const page = await browser.newPage();
    await page.setViewport({
      width: 1440,
      height: 900,
      deviceScaleFactor: 2, // Retina 2x for ultra crisp screenshots
    });

    // Clear localStorage first
    await page.goto(BASE_URL, { waitUntil: 'networkidle0' });
    await page.evaluate(() => {
      localStorage.clear();
      localStorage.setItem('avari_onboarding_completed', 'true');
    });
    await page.reload({ waitUntil: 'networkidle0' });
    await sleep(800);

    // 1. Capture Login / Auth Screen
    console.log('📸 1. Capturing 01-login-screen.png');
    await page.screenshot({
      path: path.join(screenshotsDir, '01-login-screen.png'),
      fullPage: false,
    });

    // Click "Админ (Forve)" demo login button
    console.log('🔑 Logging in as Admin (Forve)...');
    await page.evaluate(() => {
      const btns = Array.from(document.querySelectorAll('button'));
      const fBtn = btns.find((b) => b.textContent?.includes('Forve'));
      if (fBtn) fBtn.click();
    });

    await sleep(2000);

    // 2. Capture Admin Keys Dashboard
    console.log('📸 2. Capturing 02-dashboard-keys.png');
    await page.screenshot({
      path: path.join(screenshotsDir, '02-dashboard-keys.png'),
      fullPage: false,
    });

    // 3. Open Key Details Modal
    console.log('🔑 Opening Key Details / QR Code modal...');
    const openedModal = await page.evaluate(() => {
      const qrBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('QR & Конфиг') || b.textContent?.includes('Конфиг'));
      if (qrBtn) {
        qrBtn.click();
        return true;
      }
      return false;
    });

    if (openedModal) {
      await sleep(1800);
      console.log('📸 3. Capturing 03-key-qr-modal.png');
      await page.screenshot({
        path: path.join(screenshotsDir, '03-key-qr-modal.png'),
        fullPage: false,
      });

      // Close modal
      await page.evaluate(() => {
        const closeBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Закрыть') || b.querySelector('svg.lucide-x'));
        if (closeBtn) closeBtn.click();
      });
      await sleep(1000);
    }

    // Capture Create Key Modal
    console.log('➕ Opening Create Key Modal...');
    const createBtnOpened = await page.evaluate(() => {
      const createBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Создать ключ') || b.textContent?.includes('Новый ключ'));
      if (createBtn) {
        createBtn.click();
        return true;
      }
      return false;
    });

    if (createBtnOpened) {
      await sleep(1500);
      console.log('📸 Capturing 08-create-key-modal.png');
      await page.screenshot({
        path: path.join(screenshotsDir, '08-create-key-modal.png'),
        fullPage: false,
      });

      // Close modal
      await page.evaluate(() => {
        const cancelBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent?.includes('Отмена') || b.querySelector('svg.lucide-x'));
        if (cancelBtn) cancelBtn.click();
      });
      await sleep(1000);
    }

    // 4. Admin Nodes Tab
    console.log('🌐 Navigating to Server Nodes...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, nav a'));
      const nodeTab = tabs.find((t) => t.textContent?.includes('Серверы') || t.textContent?.includes('Ноды'));
      if (nodeTab) nodeTab.click();
    });
    await sleep(1500);
    console.log('📸 4. Capturing 04-admin-nodes.png');
    await page.screenshot({
      path: path.join(screenshotsDir, '04-admin-nodes.png'),
      fullPage: false,
    });

    // 5. Admin Users Tab
    console.log('👥 Navigating to Users Moderation...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, nav a'));
      const userTab = tabs.find((t) => t.textContent?.includes('Пользователи'));
      if (userTab) userTab.click();
    });
    await sleep(1500);
    console.log('📸 5. Capturing 05-admin-users.png');
    await page.screenshot({
      path: path.join(screenshotsDir, '05-admin-users.png'),
      fullPage: false,
    });

    // 6. Admin Audit Logs Tab
    console.log('📜 Navigating to Audit Logs...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, nav a'));
      const logTab = tabs.find((t) => t.textContent?.includes('Журнал') || t.textContent?.includes('Аудит') || t.textContent?.includes('Логи'));
      if (logTab) logTab.click();
    });
    await sleep(1500);
    console.log('📸 6. Capturing 06-admin-audit-logs.png');
    await page.screenshot({
      path: path.join(screenshotsDir, '06-admin-audit-logs.png'),
      fullPage: false,
    });

    // 7. Billing Tab
    console.log('💳 Navigating to Billing...');
    await page.evaluate(() => {
      const tabs = Array.from(document.querySelectorAll('button, nav a'));
      const billTab = tabs.find((t) => t.textContent?.includes('Биллинг') || t.textContent?.includes('Оплата'));
      if (billTab) billTab.click();
    });
    await sleep(1500);
    console.log('📸 7. Capturing 07-cooperative-billing.png');
    await page.screenshot({
      path: path.join(screenshotsDir, '07-cooperative-billing.png'),
      fullPage: false,
    });

    await browser.close();
    console.log('🎉 All screenshots captured successfully in _docs/screenshots/!');
  } finally {
    vite.kill();
  }
}

main().catch((err) => {
  console.error('❌ Error during capture:', err);
  process.exit(1);
});
