import { spawn } from 'node:child_process';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright-core';

const root = new URL('..', import.meta.url).pathname;
const dataDir = await mkdtemp(join(tmpdir(), 'lingo-http-e2e-'));
const serverPort = 34568, webPort = 4175;
const api = `http://127.0.0.1:${serverPort}`;
const web = `http://127.0.0.1:${webPort}`;
const server = spawn('node', ['apps/server/dist/main.js'], { cwd: root, env: { ...process.env, DATA_FILE: join(dataDir, 'data.json'), PORT: String(serverPort), CORS_ORIGIN: web, SPEAKING_PROVIDER: 'mock' }, stdio: 'ignore' });
const preview = spawn('npm', ['--prefix', 'apps/web', 'run', 'preview', '--', '--host', '127.0.0.1', '--port', String(webPort)], { cwd: root, stdio: 'ignore' });
let browser;
async function ready(url) { for (let i = 0; i < 80; i++) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise(resolve => setTimeout(resolve, 100)); } throw Error(`Server unavailable: ${url}`); }
try {
  await ready(`${api}/api/health`); await ready(web);
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  await context.addInitScript(() => { Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel() {}, speak() {}, getVoices() { return []; }, addEventListener() {}, removeEventListener() {} } }); });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${web}/level/test`);
  await page.getByText('1 / 20').waitFor();
  for (let n = 0; n < 20; n++) { await page.getByText('모르겠어요').click(); await page.waitForTimeout(250); }
  await page.waitForURL('**/level/result');
  await page.getByText('Lv.1', { exact: true }).first().waitFor();
  await page.goto(`${web}/home`);
  await page.getByRole('button', { name: '오늘 학습 시작' }).click();
  await page.waitForURL('**/learn');
  for (let n = 0; n < 10; n++) await page.getByRole('button', { name: '알아요' }).click();
  await page.waitForURL('**/quiz');
  for (let n = 0; n < 30 && page.url().endsWith('/quiz'); n++) {
    const next = page.getByRole('button', { name: '다음', exact: true });
    if (await next.isVisible().catch(() => false)) await next.click();
    else {
      const option = page.locator('.choices button:not(.disabled)').first();
      if (await option.isVisible().catch(() => false)) await option.click();
      else await page.waitForTimeout(300);
    }
    await page.waitForTimeout(900);
  }
  await page.waitForURL('**/result');
  await page.getByText('학습 결과').waitFor();
  await page.goto(`${web}/speaking`);
  await page.getByRole('button', { name: /카페에서 주문하기/ }).click();
  await page.waitForURL('**/conversation?scenario=cafe');
  await page.getByRole('button', { name: /타이핑/ }).click();
  const input = page.getByPlaceholder('영어로 입력하세요');
  await input.waitFor({ state: 'visible' });
  for (const sentence of ['I want coffee', 'Could I have milk?', 'Thank you very much']) {
    await input.fill(sentence); await page.getByRole('button', { name: '전송' }).click();
    await page.getByText(sentence, { exact: true }).waitFor();
    await page.getByText('That sounds interesting. What happened next?').last().waitFor();
  }
  await page.getByRole('button', { name: '종료' }).click();
  await page.waitForURL('**/speaking/summary');
  await page.getByText('3턴').waitFor();
  if (errors.length) throw Error(errors.join('\n'));
  console.log('Full browser/API smoke passed: 20-question level test, 10-word study, quiz result, 3-turn speaking summary');
} finally {
  await browser?.close(); preview.kill('SIGTERM'); server.kill('SIGTERM'); await rm(dataDir, { recursive: true, force: true });
}
