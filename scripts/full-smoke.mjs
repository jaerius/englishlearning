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
const preview = spawn('node', ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(webPort)], { cwd: join(root, 'apps/web'), stdio: 'ignore' });
let browser;
async function ready(url) { for (let i = 0; i < 80; i++) { try { if ((await fetch(url)).ok) return; } catch {} await new Promise(resolve => setTimeout(resolve, 100)); } throw Error(`Server unavailable: ${url}`); }
try {
  await ready(`${api}/api/health`); await ready(web);
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox', '--use-fake-ui-for-media-stream', '--use-fake-device-for-media-stream'] });
  const context = await browser.newContext({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  await context.addInitScript(() => {
    window.__recordings = 0;
    Object.defineProperty(window, 'speechSynthesis', { configurable: true, value: { cancel() {}, speak(utterance) { setTimeout(() => utterance.onend?.(), 20); }, getVoices() { return []; }, addEventListener() {}, removeEventListener() {} } });
    Object.defineProperty(navigator, 'mediaDevices', { configurable: true, value: { getUserMedia: async () => ({ getTracks: () => [{ stop() {} }] }) } });
    window.MediaRecorder = class {
      static isTypeSupported() { return true; }
      constructor() { this.state = 'inactive'; this.mimeType = 'audio/webm'; }
      start() { this.state = 'recording'; window.__recordings += 1; }
      stop() { this.state = 'inactive'; setTimeout(() => { this.ondataavailable?.({ data: new Blob(['voice'], { type: 'audio/webm' }) }); this.onstop?.(); }, 0); }
    };
  });
  const page = await context.newPage();
  const errors = []; page.on('pageerror', error => errors.push(error.message));
  await page.goto(`${web}/level/test`);
  await page.getByText('1 / 24').waitFor();
  for (let n = 0; n < 24; n++) { await page.getByText('모르겠어요').click(); await page.waitForTimeout(250); }
  await page.waitForURL('**/level/result');
  await page.getByText('CEFR A1', { exact: true }).first().waitFor();
  await page.goto(`${web}/home`);
  await page.getByRole('button', { name: '오늘 학습 시작' }).click();
  await page.waitForURL('**/learn');
  for (let n = 0; n < 10; n++) await page.getByRole('button', { name: '알아요' }).click();
  await page.waitForURL('**/quiz');
  for (let n = 0; n < 40 && page.url().endsWith('/quiz'); n++) {
    const next = page.getByRole('button', { name: '다음', exact: true });
    if (await next.isVisible().catch(() => false)) await next.click();
    else {
      const option = page.locator('.choices button:not(.disabled)').first();
      if (await option.isVisible().catch(() => false)) await option.click();
      else await page.waitForTimeout(300);
    }
    await page.waitForTimeout(900);
  }
  if (page.url().endsWith('/quiz')) await page.screenshot({path:'/tmp/lingo-quiz-stuck.png'});
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
  await page.getByText('나의 다음 연습').waitFor();
  await page.getByRole('button', { name: '표현 저장' }).click();
  await page.getByRole('button', { name: '저장됨' }).waitFor();
  await page.goto(`${web}/speaking/phrases`);
  await page.getByText('That sounds interesting.', { exact: true }).waitFor();
  await page.reload();
  await page.getByText('That sounds interesting.', { exact: true }).waitFor();
  await page.getByRole('button', { name: 'That sounds interesting. 삭제' }).click();
  await page.getByText('아직 저장한 표현이 없어요.', { exact: false }).waitFor();
  await page.goto(`${web}/speaking`);
  await page.getByText('최근 대화').waitFor();
  await page.getByRole('button', { name: /카페에서 주문하기/ }).last().click();
  await page.waitForURL('**/speaking/summary');
  await page.goto(`${web}/records`);
  await page.getByText('나의 학습 코치').waitFor();
  await page.getByText('최근 말하기에서 고친 문장').waitFor();
  await page.goto(`${web}/settings`);
  await page.getByText('이번 달 예상 AI 비용').waitFor();
  await page.getByRole('button', { name: '연결 확인' }).click();
  await page.getByText('서버에 연결됐어요.', { exact: false }).waitFor();
  await page.goto(`${web}/conversation?scenario=cafe`);
  await page.getByRole('button', { name: /연속 대화 시작/ }).click();
  await page.waitForFunction(() => window.__recordings >= 1);
  await page.getByRole('button', { name: /다시 눌러 전송/ }).click();
  await page.waitForFunction(() => window.__recordings >= 2, null, { timeout: 10_000 });
  await page.getByRole('button', { name: /연속 대화 끄기/ }).click();
  const realMicContext = await browser.newContext({ viewport: { width: 390, height: 844 }, permissions: ['microphone'] });
  const realMicPage = await realMicContext.newPage();
  await realMicPage.goto(`${web}/conversation?scenario=cafe`);
  await realMicPage.getByRole('button', { name: /눌러서 말하기/ }).click();
  await realMicPage.getByRole('button', { name: /다시 눌러 전송/ }).waitFor();
  await realMicPage.waitForTimeout(900);
  await realMicPage.getByRole('button', { name: /다시 눌러 전송/ }).click();
  await realMicPage.getByText('I would like a coffee, please.', { exact: true }).waitFor();
  await realMicContext.close();
  if (errors.length) throw Error(errors.join('\n'));
  console.log('Full browser/API smoke passed: level test, study, quiz, speaking summary, coach evidence, saved phrase lifecycle, server health, automatic next-turn listening, and real Chromium MediaRecorder with fake microphone');
} finally {
  await browser?.close(); preview.kill('SIGTERM'); server.kill('SIGTERM'); await rm(dataDir, { recursive: true, force: true });
}
