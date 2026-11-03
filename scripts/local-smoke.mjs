import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';
import { WORD_SEEDS } from '../packages/content/dist/words.js';

const port = 4176;
const base = `http://127.0.0.1:${port}`;
const preview = spawn('node', ['node_modules/vite/bin/vite.js', 'preview', '--host', '127.0.0.1', '--port', String(port)], { cwd: new URL('../apps/web/', import.meta.url), stdio: 'ignore' });
let browser;
async function ready() {
  for (let attempt = 0; attempt < 80; attempt++) {
    try { if ((await fetch(base)).ok) return; } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error('Local web preview unavailable');
}
try {
  await ready();
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const page = await browser.newPage({ viewport: { width: 390, height: 844 }, isMobile: true, hasTouch: true, locale: 'ko-KR' });
  await page.goto(`${base}/level/test`);
  await page.getByText('1 / 24').waitFor();
  for (let index = 0; index < 24; index++) {
    await page.getByText('모르겠어요').click();
    await page.waitForTimeout(230);
  }
  await page.waitForURL('**/level/result');
  await page.getByText('CEFR A1').waitFor();
  await page.goto(`${base}/home`);
  await page.getByText('연속 학습 0일').waitFor();
  await page.getByRole('button', { name: '오늘 학습 시작' }).click();
  await page.waitForURL('**/learn');
  for (let index = 0; index < 10; index++) await page.getByRole('button', { name: '알아요' }).click();
  await page.waitForURL('**/quiz');
  let first = true;
  for (let index = 0; index < 25 && page.url().endsWith('/quiz'); index++) {
    const word = await page.locator('.question h1').innerText();
    const correct = WORD_SEEDS.find(item => item.word === word)?.meaningKo;
    if (!correct) throw new Error(`Unknown quiz word: ${word}`);
    if (first) {
      const choices = await page.locator('.choices button').allTextContents();
      await page.getByRole('button', { name: choices.find(choice => choice !== correct), exact: true }).click();
      await page.getByRole('button', { name: '다음' }).click();
      first = false;
    } else {
      await page.getByRole('button', { name: correct, exact: true }).click();
      await page.waitForTimeout(950);
    }
  }
  await page.waitForURL('**/result');
  await page.getByText('10개 단어를 학습했어요').waitFor();
  await page.goto(`${base}/home`);
  await page.getByText('연속 학습 1일').waitFor();
  await page.reload();
  await page.getByText('연속 학습 1일').waitFor();
  await page.getByRole('button', { name: /오답노트/ }).click();
  await page.getByText('1회').waitFor();
  console.log('Local browser smoke passed: 24-question placement, 10-word study, one deliberate wrong answer, real streak, wrong note, and reload persistence');
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}
