# Mac mini 운영 배포

현재 제품은 Vercel의 정적 PWA와 Mac mini의 개인 API로 나뉜다. iPhone은 Tailscale에 연결한 뒤 Vercel 앱을 열고, 브라우저가 tailnet 안의 API를 HTTPS로 호출한다. API 키와 학습 데이터는 Mac mini 밖으로 배포하지 않는다.

## 1. 현재 저장소의 한계

서버는 `/data/lingo-loop.sqlite`의 SQLite 데이터베이스를 사용한다. WAL과 트랜잭션으로 상태를 저장하고 백업 API로 실행 중 일관된 사본을 만든다. 현재는 기획서의 여러 정규화 테이블 대신 `app_state` 한 행에 앱 상태를 담는다. 개인용 단일 API 컨테이너만 실행하고, Mac mini에서 정전·복구 리허설을 해야 한다.

## 2. Mac mini 준비와 실행

필요한 것은 Docker Desktop, Tailscale, 이 저장소다. 저장소 루트에서 다음을 실행한다.

```bash
cp .env.example deploy/.env
chmod 600 deploy/.env
```

`deploy/.env`의 `CORS_ORIGIN`을 실제 Vercel 프로덕션 주소로 맞춘다. 실제 말하기를 켜려면 Mac mini의 `deploy/.env`에 `SPEAKING_PROVIDER=live`, `OPENAI_API_KEY`, `ANTHROPIC_API_KEY`를 설정한다. 키가 없으면 말하기 요청은 503으로 종료된다. `SPEAKING_PROVIDER=mock`은 개발 검증에만 사용한다. 키를 Vercel 환경변수나 `VITE_` 변수에 넣으면 안 된다.

```bash
docker compose -f deploy/compose.yaml --env-file deploy/.env build
docker compose -f deploy/compose.yaml --env-file deploy/.env up -d
docker compose -f deploy/compose.yaml --env-file deploy/.env ps
curl --fail http://127.0.0.1:3001/api/health
```

컨테이너는 일반 사용자, 읽기 전용 루트 파일시스템, capability 제거 상태로 실행된다. 데이터만 `deploy/data`에 기록한다.

## 3. Tailscale HTTPS

Mac mini와 iPhone을 같은 tailnet에 로그인하고 MagicDNS와 HTTPS 인증서를 활성화한다. Mac mini에서 로컬 API만 tailnet에 공개한다.

```bash
tailscale serve --bg http://127.0.0.1:3001
tailscale serve status
```

표시된 `https://<mac-name>.<tailnet>.ts.net` 주소에서 `/api/health`가 열려야 한다. `tailscale funnel`은 사용하지 않는다. 일반 인터넷 공개도 필요 없다.

## 4. Vercel 연결

Vercel 프로젝트의 Production 환경변수에 아래 한 개를 설정하고 다시 배포한다.

```text
VITE_API_BASE_URL=https://<mac-name>.<tailnet>.ts.net
```

Mac mini의 `deploy/.env`에는 다음처럼 정확한 브라우저 origin을 둔다.

```text
CORS_ORIGIN=https://englishlearning-phi.vercel.app
```

Preview 배포를 검사할 때만 쉼표로 preview origin을 추가한다. 와일드카드 origin은 사용하지 않는다. iPhone에서 Tailscale을 끄면 웹 셸과 캐시는 열릴 수 있지만 서버 학습 데이터와 AI 대화는 동기화되지 않는 것이 정상이다.

## 5. 백업과 복구

백업 스크립트는 실행 중인 API의 SQLite backup API로 `deploy/data/backups/lingo-loop-*.sqlite`를 만든 뒤 무결성을 검사한다. 30일보다 오래된 사본은 삭제한다.

```bash
chmod +x deploy/backup.sh deploy/restore.sh
./deploy/backup.sh
```

macOS `launchd`에서 매일 한 번 실행한다. 같은 디스크 고장에 대비해 백업 디렉터리를 암호화된 외장 디스크에도 복사한다. 복구 스크립트는 입력 파일의 SQLite 무결성을 검사하고 현재 상태를 먼저 백업한 다음 API를 멈춰 교체한다.

```bash
./deploy/restore.sh deploy/data/backups/lingo-loop-YYYYMMDDTHHMMSSZ.sqlite
curl --fail http://127.0.0.1:3001/api/health
```

복구 후 홈의 학습 수, 오답노트, 말하기 기록을 함께 확인한다.

## 6. iPhone 출시 전 확인

1. iPhone Tailscale을 켜고 Safari에서 tailnet `/api/health`를 연다.
2. Vercel 주소를 Safari로 열어 레벨 테스트부터 학습 결과까지 완료한다.
3. Safari 공유 메뉴에서 `홈 화면에 추가`하고, 설치 아이콘으로 다시 열어 `/home` 직접 경로와 하단 safe area를 확인한다.
4. 말하기에서 마이크를 허용하고 30초 제한, 재탭 종료, 권한 거부 후 재시도를 확인한다.
5. 설정의 영어 음성을 자동 추천과 직접 선택으로 각각 재생한다. iOS에 내려받은 Siri 영어 음성에 따라 Web Speech TTS 품질이 달라진다.
6. 화면을 잠갔다가 돌아오고, 네트워크를 끊었다 켠 뒤 중복 답안이나 데이터 유실이 없는지 확인한다.
7. 40번째 AI 턴은 성공하고 41번째는 서버의 429 응답으로 차단되는지 확인한다.

브라우저 TTS는 기기에 설치된 음성을 사용하므로 서버 비용은 들지 않는다. OpenAI STT와 Anthropic 대화 어댑터가 연결되어 있다. 서버는 일일 40턴과 기본 월 600턴/음성 인식 요청 한도를 강제한다. 공급자 사용량과 실제 청구액을 계측해 월 KRW 5,000 이하인지 확인해야 한다. 현재 수량 한도만으로 비용을 보증할 수 없다.

## 7. 운영 점검

```bash
docker compose -f deploy/compose.yaml --env-file deploy/.env ps
docker compose -f deploy/compose.yaml --env-file deploy/.env logs --tail=200 api
curl --fail https://<mac-name>.<tailnet>.ts.net/api/health
```

업데이트할 때는 먼저 백업한 뒤 `docker compose ... build`와 `docker compose ... up -d`를 실행한다. 컨테이너가 unhealthy면 새 기능 검수 전에 로그와 데이터 파일 SQLite 무결성 검사부터 확인한다.
