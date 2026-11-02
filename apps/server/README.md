# Lingo Loop API

NestJS 개인 API. `npm ci --ignore-scripts`, `npm test`, `npm run build`, `npm run dev`로 개발한다. `/api` 아래에 레벨 테스트, 학습·복습, 설정, 통계, 말하기 엔드포인트가 있다.

데이터는 `DATA_FILE`(기본 `data/lingo-loop.sqlite`)의 SQLite에 저장한다. 현재 모든 앱 상태를 `app_state` 한 행의 JSON payload로 보관하며, 매 변경을 SQLite 트랜잭션에 기록한다. 개인용 단일 프로세스에서 동작하지만 기획서의 개별 정규화 테이블은 아직 구현되지 않았다. 백업은 Node 내장 SQLite backup API를 사용한다.

단어 콘텐츠는 `packages/content`의 자체 작성 60개 개발 시드다. 말하기는 `SPEAKING_PROVIDER=live`와 서버 전용 OpenAI·Anthropic 키를 설정하면 실제 공급자를 호출하고, `mock`은 자동 테스트에만 사용한다. 녹음 파일은 저장하지 않고 전사 요청에 전달한다. 기본 일일 40턴·월 600턴/음성 인식 요청 한도를 서버에서 강제한다.
