# Lingo Loop

개인용 영어 학습 PWA. 사용자가 제공한 상세 기획서를 기준으로 15개 화면, 단계별 단어 복습, AI 대화 경로를 구현하고 있다. iPhone Safari에서 홈 화면에 추가할 수 있으며 Apple Developer 계정은 필요하지 않다.

- `apps/web`: React, Vite, TypeScript, 모바일 PWA
- `apps/server`: NestJS 개인 API, 학습·말하기 상태
- `packages/content`: 자체 작성 60개 개발용 단어 시드
- `docs/product-spec.md`: 기획서 기반 화면·규칙 명세
- `docs/architecture.md`: 현재 구조와 출시 차단점
- `docs/deployment.md`: Mac mini, Tailscale, Vercel 운영 절차

## 로컬 실행

```bash
npm ci --prefix apps/web --ignore-scripts
npm ci --prefix apps/server --ignore-scripts
npm run server:build
npm run web:build
npm test
```

서버는 `DATA_FILE=/path/to/lingo-loop.json npm --prefix apps/server start`로, 웹은 `npm run web`으로 실행한다. 웹 빌드에 `VITE_API_BASE_URL`을 Mac mini의 Tailscale HTTPS 주소로 지정해야 서버 학습과 AI 대화가 연결된다. 키는 서버의 `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`에만 둔다. `SPEAKING_PROVIDER=live`에서 실제 API를 호출하고 `mock`은 개발 검증용이다.

Vercel은 `vercel.json`에 따라 `apps/web/dist`를 배포한다. 서버 데이터는 현재 SQLite가 아닌 단일 JSON 파일이며 원자적 교체로 저장한다. 60개 단어는 개발 시드이고 기획서의 3,000개 콘텐츠를 대체하지 않는다. Mac mini, Tailscale, AI 키, 실제 iPhone 접근이 없어 운영 경로는 아직 검증하지 못했다. 이 상태를 프로덕션 완료로 간주하지 않는다.
