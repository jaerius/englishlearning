# Mac mini 연결 점검

사용자의 Mac mini는 이 클라우드 실행 환경과 별도 컴퓨터다. 현재 세션에는 Mac 화면을 조작하는 computer-use 도구나 Mac으로 연결된 Tailscale/SSH 경로가 없다. Docker를 Mac에 설치했다는 사실만으로 클라우드에서 Mac을 제어할 수는 없다.

Mac에서 저장소를 내려받은 다음 아래 점검을 실행한다. 이 스크립트는 설정을 변경하지 않고 버전·Docker 실행·Tailscale 로그인·서버 설정 파일·로컬 API 응답만 확인한다. 키 값은 출력하지 않는다.

```bash
git clone https://github.com/jaerius/englishlearning.git
cd englishlearning
bash deploy/mac-doctor.sh
```

Mac에서 Docker Desktop이 실행 중이고 Tailscale에 로그인했으면 `docs/deployment.md` 순서로 서버를 시작한다. AI 키는 `deploy/.env`에만 저장하고 채팅에 붙여 넣지 않는다. 서버가 켜진 뒤 `tailscale serve --bg http://127.0.0.1:3001`을 실행하고, iPhone Tailscale을 켜서 `https://<mac-name>.<tailnet>.ts.net/api/health`를 확인한다. 앱의 **설정 → 학습 서버**에는 `/api/health`를 뺀 주소를 입력한다.

Mac mini가 잠자기에 들어가면 연결이 끊긴다. macOS 업데이트 후 `sudo pmset -a sleep 0`으로 자동 시스템 잠자기를 끄고, Docker Desktop과 Tailscale이 재부팅 후 실행되는지 확인한다. 디스플레이는 꺼져도 된다. 정전·수동 종료·업데이트 재시작은 별도이며 Mac 자체 전원 복구도 확인해야 한다.
