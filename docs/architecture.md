# 영어 학습 앱 아키텍처

기준: 사용자가 제공한 2026-11-02 개인용 영어 학습 앱 기획서. 구현은 `apps/web`(iPhone Safari PWA), `apps/server`(NestJS 개인 API), `packages/content`(원본 학습 콘텐츠)로 나뉜다. Vercel은 정적 프런트엔드만 배포한다. Mac mini에서 개인 API를 단일 프로세스로 실행하고, iPhone은 Tailscale HTTPS로 접근한다. Apple Developer 계정은 필요하지 않다.

```text
iPhone Safari/PWA ── HTTPS ── Vercel 정적 앱
        │
        └── Tailscale HTTPS ── Mac mini NestJS API ── SQLite 데이터 파일
                                      ├── OpenAI 음성 인식
                                      └── Anthropic 대화·요약
```

## 데이터와 개인정보

- 학습 단계, 세션, 오답, 설정, 대화 메시지와 일일 한도는 Mac mini의 `DATA_FILE`에 저장된다. 앱의 로컬 저장소에는 설정 캐시와 전송 대기 답안만 둔다.
- 녹음 파일은 브라우저 메모리에서 업로드하고 서버가 음성 인식에 전달한다. 앱 DB나 파일시스템에 녹음 파일을 보관하지 않는다. 음성 전사는 OpenAI, 대화 텍스트는 Anthropic에 전송된다.
- 현재 SQLite의 `app_state` 한 행에 전체 앱 상태를 보관한다. 트랜잭션과 WAL을 사용하고 백업 API로 일관된 사본을 만든다. 기획서의 개별 정규화 테이블과 자동 복구는 출시 전 과제다.
- Tailnet에 로그인한 기기만 API에 접근한다. 서버 키는 Mac mini 환경변수에만 보관한다.

## 학습 경로

`GET /api/level-test/questions`는 레벨별 4문항을 낸다. 서버는 제출된 뜻을 원본 콘텐츠와 비교하여 레벨을 결정한다. 학습 세션은 복습 예정 단어를 먼저, 현재 레벨의 새 단어를 뒤에 담는다. 새 단어 카드 다음 단계별 A/B/C 퀴즈가 진행된다. SRS는 stage 0–5와 KST 날짜를 사용한다. 오답은 세션 끝에 한 번 더 내고, 점수와 단계 변경은 첫 답안에만 적용한다. 완전 암기 단어도 60일 점검일이 오면 복습 큐에 돌아온다.

## 말하기 경로

브라우저 `MediaRecorder`는 30초 이하 음성을 생성한다. `POST /api/speaking/sessions/:id/transcribe`가 OpenAI `gpt-4o-mini-transcribe`를 호출한다. 사용자가 확인한 텍스트는 `.../turn`으로 전송되며, 서버가 Claude Haiku에 현재 상황·최근 대화·목표 단어를 전달한다. 대화 중에는 교정 존재 여부만 공개하고 종료 뒤 요약에서 최대 5개 교정을 보여준다. 교정 없이 정확히 사용한 목표 단어는 하루 한 번 SRS 정답으로 반영한다. 일일 40턴과 월 600턴/음성 인식 요청 한도를 서버 데이터로 강제한다. 이 수량 한도는 실제 환율·공급자 요금에 따른 KRW 5,000 비용 보증이 아니므로 비용 계측을 추가하고 검수해야 한다.

## 화면과 배포

`apps/web`에 S1–S15 경로가 있으며 3개 하단 탭과 세션 중 탭 숨김, 모바일 safe area, PWA manifest, 음성 선택/속도 설정을 제공한다. `vercel.json`은 `apps/web/dist`를 배포하고 직접 경로를 앱 셸로 돌린다. `VITE_API_BASE_URL`은 tailnet HTTPS 주소여야 한다. 서버가 없으면 체험/오프라인 상태를 명시한다. iOS 음성 품질은 설치된 기기 음성에 좌우되므로 실기기에서 확인해야 한다.

## 현재 출시 차단점

- Mac mini/Tailscale 주소와 OpenAI·Anthropic 키가 제공되지 않아 실제 AI 경로와 iPhone 실기기를 검증하지 못했다.
- SQLite 상태 행을 기획서의 개별 테이블로 정규화하고 Mac mini에서 백업·복구 리허설을 해야 한다.
- 콘텐츠는 자체 작성 60개 개발 시드이며, 기획서의 3,000개 콘텐츠와 검수량에는 못 미친다.
- 서버 실패 후 답안 큐의 중복 전송, 장기 오프라인 세션, 전원 차단·동시 요청을 실기기에서 검증해야 한다.
- 실제 API 사용량/청구를 계측해 월 KRW 5,000 이하를 확인해야 한다.
