import { chromium } from 'playwright-core';

const browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
try {
  const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
  const page = await context.newPage();
  await page.addInitScript(() => {
    navigator.mediaDevices ||= {};
    navigator.mediaDevices.getUserMedia = async () => ({ getTracks: () => [{ stop() {} }] });
    window.MediaRecorder = class { constructor() { this.mimeType = 'audio/webm'; } start() {} stop() { this.ondataavailable?.({ data: new Blob(['audio-test-data'], { type: this.mimeType }) }); this.onstop?.(); } };
  });
  const failures = [];
  page.on('pageerror', error => failures.push(error.message));
  await page.goto('http://127.0.0.1:4173/', { waitUntil: 'networkidle' });
  await page.getByText('오늘 복습 3개').waitFor();
  await page.getByRole('button', { name: /subtle/ }).click();
  await page.getByRole('button', { name: 'good' }).click();
  await page.getByText('오늘 복습 2개').waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText('오늘 복습 2개').waitFor();
  await page.getByRole('button', { name: '음성 메모 녹음' }).click();
  await page.getByRole('button', { name: '녹음 중지·저장' }).click();
  await page.getByRole('button', { name: '재생' }).waitFor();
  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '재생' }).waitFor();
  await page.getByRole('button', { name: '삭제' }).click();
  await page.getByRole('button', { name: '재생' }).waitFor({ state: 'detached' });
  const download = page.waitForEvent('download');
  await page.getByRole('button', { name: '학습 기록 내보내기' }).click();
  const file = await download;
  if (file.suggestedFilename() !== 'lingo-loop-backup.json') throw new Error('Backup filename mismatch');
  if (failures.length) throw new Error(failures.join('\n'));
  console.log('Chromium mobile-width review, reload, recording persistence/deletion, and backup smoke passed');
} finally { await browser.close(); }
