import { useEffect, useState } from 'react';
import { loadStudyTime, saveStudyTime, shouldPromptStudy } from './study-time';

export function StudySchedule() {
  const [saved, setSaved] = useState<string | null>(() => loadStudyTime());
  const [draft, setDraft] = useState(() => loadStudyTime() ?? '20:00');
  const [message, setMessage] = useState('');

  function save() {
    try {
      saveStudyTime(draft);
      setSaved(draft);
      setMessage(`매일 한국 시간 ${draft}에 앱을 열면 학습 안내를 보여드려요.`);
    } catch (error) { setMessage(error instanceof Error ? error.message : '학습 시간을 저장하지 못했어요.'); }
  }
  function clear() {
    saveStudyTime(null);
    setSaved(null);
    setMessage('학습 시간 설정을 해제했어요.');
  }

  return <section className="studySchedule">
    <h2>매일 공부할 시간</h2>
    <p>정해 둔 시간이 지나 앱을 열면 오늘의 학습을 안내해요. 한국 시간 기준입니다.</p>
    <div className="studyScheduleRow">
      <label htmlFor="study-time">학습 시간</label>
      <input id="study-time" type="time" value={draft} onChange={event => setDraft(event.target.value)} />
    </div>
    <div className="studyScheduleActions"><button onClick={save}>시간 저장</button>{saved && <button onClick={clear}>설정 해제</button>}</div>
    {saved && <small>현재 설정: 매일 {saved}</small>}
    <small>앱이 닫혀 있을 때 울리는 알림은 아직 제공하지 않아요. iPhone ‘미리 알림’ 앱에서 같은 시간에 매일 반복 알림을 설정해 주세요.</small>
    {message && <p role="status">{message}</p>}
  </section>;
}

export function StudyTimeBanner({ studiedToday, onStart }: { studiedToday: boolean; onStart: () => void }) {
  const [visible, setVisible] = useState(() => shouldPromptStudy(loadStudyTime(), studiedToday));
  useEffect(() => {
    const update = () => setVisible(shouldPromptStudy(loadStudyTime(), studiedToday));
    update();
    const timer = window.setInterval(update, 60_000);
    window.addEventListener('visibilitychange', update);
    window.addEventListener('study-time-changed', update);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener('visibilitychange', update);
      window.removeEventListener('study-time-changed', update);
    };
  }, [studiedToday]);
  if (!visible) return null;
  return <section className="studyTimeBanner" role="status">
    <div><b>오늘의 학습 시간이에요</b><p>단어와 문장을 10분만 연습해 볼까요?</p></div>
    <button onClick={onStart}>지금 시작</button>
  </section>;
}
