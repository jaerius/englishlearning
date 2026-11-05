import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Check, ChevronRight, Volume2 } from 'lucide-react';
import { useApp } from './store';
import { speakEnglish } from './tts';
import { dueSentenceCount, gradeSentence, loadSentenceState, saveSentenceState, sentenceQueue } from './sentence-review';
import './sentence-practice.css';

export function SentencePractice() {
  const navigate = useNavigate();
  const level = useApp(state => state.settings.level);
  const voice = useApp(state => state.settings.voiceName);
  const rate = useApp(state => state.settings.ttsRate);
  const [progress, setProgress] = useState(loadSentenceState);
  const [queue] = useState(() => sentenceQueue(progress, level));
  const [index, setIndex] = useState(0);
  const [revealed, setRevealed] = useState(false);
  const [draft, setDraft] = useState('');
  const [rememberedCount, setRememberedCount] = useState(0);
  const current = queue[index];

  function grade(remembered: boolean) {
    if (!current || !revealed) return;
    const next = { ...progress, [current.id]: gradeSentence(progress[current.id], remembered) };
    try { saveSentenceState(next); }
    catch { window.alert('기기 저장 공간을 확인해 주세요. 문장 기록을 저장하지 못했어요.'); return; }
    setProgress(next);
    setRememberedCount(count => count + Number(remembered));
    setIndex(value => value + 1);
    setRevealed(false);
    setDraft('');
  }

  return <main className="sentencePractice">
    <header className="sentenceTop"><button aria-label="뒤로" onClick={() => navigate('/home')}><ArrowLeft /></button><b>문장 연습</b><span>{current ? `${index + 1} / ${queue.length}` : '완료'}</span></header>
    {current ? <>
      <div className="sentenceProgress" role="progressbar" aria-valuenow={index + 1} aria-valuemin={0} aria-valuemax={queue.length}><i style={{ width: `${(index + 1) / queue.length * 100}%` }} /></div>
      <p className="sentenceScope">CEFR {current.cefr} · {progress[current.id] ? '복습 문장' : '새 문장'}{current.spokenExampleEn ? ' · 비즈니스' : ''}</p>
      <h1>이 뜻을 영어로 말해 보세요</h1>
      <section className="sentencePrompt"><p>{current.exampleKo}</p><small>단서 단어: {current.word} · {current.meaningKo}</small></section>
      <label className="sentenceDraft" htmlFor="sentence-attempt">내가 만든 문장 <small>선택 사항 · 자동 채점하지 않아요</small></label>
      <textarea id="sentence-attempt" value={draft} onChange={event => setDraft(event.target.value)} placeholder="영어로 적거나 먼저 소리 내어 말해 보세요" rows={3} disabled={revealed} />
      {revealed && <section className="sentenceReveal">
        <div><strong>기본 예문</strong><button aria-label="예문 듣기" onClick={() => speakEnglish(current.exampleEn, rate, voice)}><Volume2 /></button></div>
        <p>{current.exampleEn}</p>
        {draft.trim() && <div className="sentenceAttempt"><strong>내가 쓴 문장</strong><p>{draft}</p></div>}
        {current.spokenExampleEn && <div className="sentenceRegisters"><strong>구어체</strong><p>{current.spokenExampleEn}</p><strong>문어체</strong><p>{current.writtenExampleEn}</p><small>{current.usageNoteKo}</small></div>}
        <small>뜻과 자연스러움을 직접 비교해 주세요. 정확한 교정은 AI 말하기에서 받을 수 있어요.</small>
      </section>}
      <div className="sentenceActions">{revealed ? <><button onClick={() => grade(false)}>다시 연습할래요</button><button onClick={() => grade(true)}><Check /> 기억했어요</button></> : <button className="sentenceRevealButton" onClick={() => setRevealed(true)}>영어 문장 보기 <ChevronRight /></button>}</div>
    </> : <section className="sentenceDone"><Check /><h1>오늘 문장 연습 완료</h1><p>{queue.length}개 문장을 확인했고, {rememberedCount}개를 기억했어요.</p><small>복습 예정 {dueSentenceCount(progress)}개 · 이 기록은 이 기기에 저장됩니다.</small><button onClick={() => navigate('/home')}>학습 홈으로</button></section>}
    <p className="sentenceStorage">문장은 기억 정도에 따라 1·3·7·14·30·60일 간격으로 다시 나옵니다. 현재 문장 기록은 서버와 동기화되지 않아요.</p>
  </main>;
}
