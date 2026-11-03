import { useState } from 'react';
import { apiBaseUrl, saveApiBaseUrl } from './api';

export function ServerConnection() {
  const [url, setUrl] = useState(apiBaseUrl);
  const [status, setStatus] = useState('');
  const [checking, setChecking] = useState(false);
  async function check() {
    setChecking(true); setStatus('서버 확인 중…');
    try {
      const parsed = new URL(url.trim());
      if (parsed.protocol !== 'https:' && !(parsed.protocol === 'http:' && ['localhost', '127.0.0.1'].includes(parsed.hostname))) throw new Error('HTTPS 주소를 입력해 주세요.');
      const response = await fetch(`${parsed.origin}/api/health`, { signal: AbortSignal.timeout(8000) });
      if (!response.ok) throw new Error(`서버 응답 ${response.status}`);
      setStatus('서버에 연결됐어요. 저장하면 학습 데이터가 동기화돼요.');
    } catch (error) { setStatus(error instanceof Error ? `연결 실패: ${error.message}` : '서버에 연결하지 못했어요.'); }
    finally { setChecking(false); }
  }
  return <section className="serverConnection">
    <h2>학습 서버</h2>
    <p>iPhone과 Mac mini에서 Tailscale을 켠 뒤, Mac mini의 HTTPS 주소를 입력하세요. 서버가 꺼져 있으면 단어 학습은 이 기기에 저장됩니다.</p>
    <label htmlFor="api-url">서버 주소</label>
    <input id="api-url" type="url" inputMode="url" value={url} onChange={event => setUrl(event.target.value)} placeholder="https://mac-name.tailnet.ts.net" autoCapitalize="off" autoCorrect="off" spellCheck={false}/>
    <div className="serverActions"><button disabled={!url.trim()||checking} onClick={() => void check()}>연결 확인</button><button onClick={() => { try { saveApiBaseUrl(url); } catch (error) { setStatus(error instanceof Error ? error.message : '주소를 확인해 주세요.'); } }}>주소 저장</button></div>
    {status && <p role="status">{status}</p>}
  </section>;
}
