#!/usr/bin/env bash
set -u

repo_root="$(cd "$(dirname "$0")/.." && pwd)"
cd "$repo_root" || exit 1

if [ "$(uname -s)" != "Darwin" ]; then
  printf '%s\n' '이 점검 스크립트는 Mac mini의 터미널에서 실행하세요.'
  exit 2
fi

printf 'macOS: %s\n' "$(sw_vers -productVersion)"
printf 'Mac: %s\n' "$(sysctl -n hw.model 2>/dev/null || printf '모델 확인 불가')"

if command -v docker >/dev/null 2>&1; then
  if docker info >/dev/null 2>&1; then
    printf '%s\n' 'Docker: 실행 중'
  else
    printf '%s\n' 'Docker: 설치됐지만 엔진이 실행되지 않습니다. Docker Desktop을 여세요.'
  fi
else
  printf '%s\n' 'Docker: 설치되지 않았거나 터미널 경로에 없습니다.'
fi

if command -v tailscale >/dev/null 2>&1; then
  if tailscale status >/dev/null 2>&1; then
    printf '%s\n' 'Tailscale: 로그인·연결 확인됨'
    if tailscale serve status >/dev/null 2>&1; then
      printf '%s\n' 'Tailscale Serve: 상태 명령 사용 가능'
    fi
  else
    printf '%s\n' 'Tailscale: 설치됐지만 연결되지 않았습니다. 앱에서 같은 계정으로 로그인하세요.'
  fi
else
  printf '%s\n' 'Tailscale: CLI를 찾지 못했습니다. 공식 macOS 앱 설치와 로그인을 확인하세요.'
fi

if [ -f deploy/.env ]; then
  printf '%s\n' '서버 설정 파일: deploy/.env 있음 (내용은 출력하지 않음)'
  if ! grep -Eq '^OPENAI_API_KEY=.+$' deploy/.env; then
    printf '%s\n' 'AI 키: OPENAI_API_KEY가 비어 있습니다. 키 값은 채팅에 보내지 말고 deploy/.env에만 입력하세요.'
  else
    printf '%s\n' 'AI 키: OpenAI 설정 항목이 비어 있지 않습니다 (유효성은 확인하지 않음)'
  fi
else
  printf '%s\n' '서버 설정 파일: 없음. cp .env.example deploy/.env 후 Mac에서 직접 입력하세요.'
fi

if curl --silent --show-error --fail --max-time 3 http://127.0.0.1:3001/api/health >/dev/null 2>&1; then
  printf '%s\n' '로컬 API: 정상 응답'
else
  printf '%s\n' '로컬 API: 응답 없음. Docker Compose 서비스를 시작하고 로그를 확인하세요.'
fi

printf '%s\n' '점검이 끝났습니다. 이 출력에는 비밀번호·API 키가 포함되지 않습니다.'
