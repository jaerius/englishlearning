import { spawn } from 'node:child_process';
import { chromium } from 'playwright-core';

const host = '127.0.0.1';
const port = Number(process.env.APP_SMOKE_PORT || 4174);
const baseURL = `http://${host}:${port}`;
const preview = spawn(
  'npm',
  ['--prefix', 'apps/web', 'run', 'preview', '--', '--host', host, '--port', String(port)],
  { cwd: new URL('..', import.meta.url), stdio: ['ignore', 'pipe', 'pipe'] },
);

let previewOutput = '';
preview.stdout.on('data', chunk => { previewOutput += chunk; });
preview.stderr.on('data', chunk => { previewOutput += chunk; });

async function waitForPreview() {
  const deadline = Date.now() + 15_000;
  while (Date.now() < deadline) {
    if (preview.exitCode !== null) throw new Error(`Vite preview exited early:\n${previewOutput}`);
    try {
      const response = await fetch(baseURL);
      if (response.ok) return;
    } catch {}
    await new Promise(resolve => setTimeout(resolve, 150));
  }
  throw new Error(`Timed out waiting for ${baseURL}\n${previewOutput}`);
}

const routes = [
  { path: '/level', text: '내 수준 알아보기', cta: '시작하기' },
  { path: '/home', text: '오늘도 좋은 흐름이에요', cta: /학습하기|학습 시작/ },
  { path: '/learn', text: '카드를 눌러 뜻 보기', cta: '알아요' },
  { path: '/quiz', text: '알맞은 뜻을 골라 보세요' },
  { path: '/speaking', text: '추천 상황', cta: '내가 만든 상황으로 연습' },
  { path: '/speaking/custom', text: '상황 만들기', cta: '대화 시작' },
  { path: '/conversation?scenario=cafe', text: '카페에서 주문하기', cta: '눌러서 말하기' },
  { path: '/speaking/summary', text: '대화 요약', cta: '말하기 홈으로' },
  { path: '/records', text: '내 기록', cta: '오답노트' },
  { path: '/settings', text: '소리와 음성', cta: '음성 미리 듣기' },
];

let browser;
try {
  await waitForPreview();
  browser = await chromium.launch({ executablePath: '/usr/bin/chromium', args: ['--no-sandbox'] });
  const context = await browser.newContext({
    viewport: { width: 390, height: 844 },
    isMobile: true,
    hasTouch: true,
    locale: 'ko-KR',
  });
  await context.addInitScript(() => {
    Object.defineProperty(window, 'speechSynthesis', {
      configurable: true,
      value: {
        cancel() {},
        speak() {},
        getVoices() { return []; },
        addEventListener() {},
        removeEventListener() {},
      },
    });
  });

  const failures = [];
  for (const route of routes) {
    const page = await context.newPage();
    const routeErrors = [];
    page.on('pageerror', error => routeErrors.push(`pageerror: ${error.message}`));
    page.on('console', message => {
      if (message.type() === 'error') routeErrors.push(`console: ${message.text()}`);
    });
    const response = await page.goto(`${baseURL}${route.path}`, { waitUntil: 'networkidle' });
    if (!response?.ok()) routeErrors.push(`HTTP ${response?.status() ?? 'no response'}`);
    await page.getByText(route.text, { exact: false }).first().waitFor({ state: 'visible' });
    if (route.cta) await page.getByText(route.cta, { exact: false }).first().waitFor({ state: 'visible' });
    const layout = await page.evaluate(() => ({
      viewport: window.innerWidth,
      document: document.documentElement.scrollWidth,
      body: document.body.scrollWidth,
    }));
    if (layout.document > layout.viewport + 1 || layout.body > layout.viewport + 1) {
      routeErrors.push(`horizontal overflow: viewport=${layout.viewport}, document=${layout.document}, body=${layout.body}`);
    }
    if (['/home', '/speaking', '/speaking/summary'].includes(route.path)) {
      const name = route.path.slice(1).replaceAll('/', '-');
      await page.screenshot({ path: `apps/web/artifacts/${name}-final-390x844.png`, fullPage: true });
    }
    if (routeErrors.length) failures.push(`${route.path}: ${routeErrors.join(' | ')}`);
    await page.close();
  }

  if (failures.length) throw new Error(`Mobile app smoke failed:\n${failures.join('\n')}`);
  console.log(`Mobile app smoke passed: ${routes.length} routes at 390x844, direct navigation, CTAs, runtime errors, and horizontal overflow`);
} finally {
  await browser?.close();
  preview.kill('SIGTERM');
}
