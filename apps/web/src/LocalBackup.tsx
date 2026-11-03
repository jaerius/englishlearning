import { useState, type ChangeEvent } from 'react';
import { useApp } from './store';
import { parseLocalBackup, type Backup } from './local-backup';

export function LocalBackup() {
  const [message, setMessage] = useState('');
  const localProgress = useApp(state => state.localProgress);
  const localDaily = useApp(state => state.localDaily);
  function download() {
    const payload: Backup = { format: 'lingo-loop-local-v1', exportedAt: new Date().toISOString(), localProgress, localDaily };
    const url = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = `lingo-loop-backup-${new Date().toISOString().slice(0, 10)}.json`; anchor.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setMessage('학습 기록을 파일로 저장했어요. iPhone 파일 앱에서 보관해 주세요.');
  }
  async function restore(event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]; event.target.value = '';
    if (!file) return;
    if (file.size > 2_000_000) { setMessage('백업 파일이 너무 커요.'); return; }
    try {
      const data = parseLocalBackup(await file.text());
      if (!window.confirm('이 기기의 로컬 학습 기록을 백업 파일로 바꿀까요?')) return;
      useApp.setState({ localProgress: data.localProgress, localDaily: data.localDaily });
      await useApp.getState().bootstrap();
      setMessage('로컬 학습 기록을 복원했어요.');
    } catch (error) { setMessage(error instanceof Error ? error.message : '파일을 읽지 못했어요.'); }
  }
  return <section className="localBackup">
    <h2>이 기기 학습 기록 백업</h2>
    <p>서버를 연결하기 전에는 기기 변경이나 Safari 데이터 삭제에 대비해 백업 파일을 보관하세요.</p>
    <div><button onClick={download}>백업 파일 저장</button><label>백업 파일 가져오기<input type="file" accept="application/json,.json" onChange={event => void restore(event)}/></label></div>
    {message && <p role="status">{message}</p>}
  </section>;
}
