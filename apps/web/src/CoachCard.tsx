import { useEffect, useState } from 'react';
import { api, isApiConfigured, type CoachSummary } from './api';

export function CoachCard() {
  const [data, setData] = useState<CoachSummary | null>(null);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isApiConfigured) return;
    void api.coach().then(setData).catch(e => setError(e instanceof Error ? e.message : '진단을 불러오지 못했어요.'));
  }, []);
  return <section className="coachCard">
    <div className="coachHead"><span>나의 학습 코치</span><b>최근 30일</b></div>
    <h2>{data?.insufficientData ? '몇 번 더 풀면 약점을 찾을 수 있어요' : data?.weaknesses.length ? '여기부터 다시 연습해요' : '학습 기록을 쌓아보세요'}</h2>
    <p>{error || data?.recommendationKo || '단어 퀴즈를 풀면 실제 답안 기록으로 취약한 수준과 품사를 찾아드려요.'}</p>
    {data && <><small>{data.sampleSize}번의 첫 답안 기준 · 실제 학습 기록 분석</small>{data.weaknesses.length > 0 && <div className="coachWeaknesses">{data.weaknesses.slice(0, 3).map(item => <span key={`${item.cefr}-${item.pos}`}>{item.cefr} {item.pos} · 정답률 {item.accuracy}%</span>)}</div>}{data.speakingCorrections?.length ? <div className="coachCorrection"><b>최근 말하기에서 고친 문장</b><del>{data.speakingCorrections[0].original}</del><strong>{data.speakingCorrections[0].corrected}</strong><small>{data.speakingCorrections[0].explanationKo}</small></div> : null}</>}
  </section>;
}
