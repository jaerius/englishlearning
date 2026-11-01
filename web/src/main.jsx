import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import { deleteRecording, pruneRecordings, putRecording, listCards, replaceCards, saveReview, exportLearningData, importLearningData } from './storage';
import { dueCards, initialCards, reviewWithLog } from './review';
import { createVoiceController } from './voice';
import './style.css';
import './fixes.css';

function App() {
  const [cards, setCards] = useState([]), [notes, setNotes] = useState([]);
  const [text, setText] = useState(''), [reply, setReply] = useState('영어로 한 문장을 말하거나 입력해 보세요.');
  const [revealed, setRevealed] = useState(false), [recording, setRecording] = useState(false);
  const [voicePhase, setVoicePhase] = useState('idle'), [error, setError] = useState('');
  const recorder = useRef(null), stream = useRef(null), chunks = useRef([]), audioUrl = useRef(null), voice = useRef(null), activeRef = useRef(null), fileInput = useRef(null);
  const due = dueCards(cards), active = due[0];
  activeRef.current = active;
  useEffect(() => {
    pruneRecordings().then(setNotes).catch(() => setError('녹음 저장소를 열 수 없습니다.'));
    listCards().then(async saved => { if (saved.length) setCards(saved); else { const seeded = await initialCards(); await replaceCards(seeded); setCards(seeded); } }).catch(() => setError('학습 데이터를 불러오지 못했습니다.'));
    voice.current = createVoiceController({ getReply: async sentence => { const prompt = activeRef.current?.front || 'in my opinion'; const response = `Good. Tell me more using ${prompt}.`; setReply(response); return { text: response, lang: 'en-US' }; }, onState: setVoicePhase, onTranscript: setText, onError: setError });
    return () => { voice.current?.stop(); if (audioUrl.current) URL.revokeObjectURL(audioUrl.current); stream.current?.getTracks().forEach(track => track.stop()); };
  }, []);
  const respond = sentence => {
    const prompt = active?.front || 'in my opinion';
    const response = sentence.trim() ? `좋아요. 이번에는 “${prompt}”를 넣어 조금 더 길게 말해 보세요.` : '한 문장부터 시작해 보세요.';
    setReply(response); speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(response); utterance.lang = 'ko-KR'; speechSynthesis.speak(utterance);
  };
  const toggleListening = () => { if (voice.current?.phase === 'idle' || voice.current?.phase === 'error') voice.current.start(); else voice.current?.stop(); };
  const toggleRecording = async () => {
    if (recording) { recorder.current?.stop(); setRecording(false); return; }
    try {
      const microphone = await navigator.mediaDevices.getUserMedia({ audio: true }); stream.current = microphone; chunks.current = [];
      const instance = new MediaRecorder(microphone); recorder.current = instance;
      instance.ondataavailable = event => { if (event.data.size) chunks.current.push(event.data); };
      instance.onstop = async () => { microphone.getTracks().forEach(track => track.stop()); try { await putRecording(new Blob(chunks.current, { type: instance.mimeType })); setNotes(await pruneRecordings()); } catch { setError('녹음을 저장하지 못했습니다. 저장 공간을 확인해 주세요.'); } };
      instance.start(); setRecording(true); setError('');
    } catch { setError('마이크를 사용할 수 없습니다. Safari 권한과 HTTPS 연결을 확인해 주세요.'); }
  };
  const play = item => { if (audioUrl.current) URL.revokeObjectURL(audioUrl.current); audioUrl.current = URL.createObjectURL(item.blob); new Audio(audioUrl.current).play().catch(() => setError('녹음을 재생하지 못했습니다.')); };
  const remove = async id => { await deleteRecording(id); setNotes(await pruneRecordings()); };
  const grade = async value => { try { const { card, revlog } = await reviewWithLog(active, value); await saveReview(card, revlog); setCards(cards.map(item => item.id === active.id ? card : item)); setRevealed(false); } catch { setError('복습 결과를 저장하지 못했습니다.'); } };
  const exportData = async () => { try { const backup = await exportLearningData(); const url = URL.createObjectURL(new Blob([JSON.stringify(backup)], { type: 'application/json' })); const link = document.createElement('a'); link.href = url; link.download = 'lingo-loop-backup.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000); } catch { setError('백업 파일을 만들지 못했습니다.'); } };
  const restoreData = async event => { const file = event.target.files?.[0]; if (!file) return; try { const backup = JSON.parse(await file.text()); await importLearningData(backup); setCards(await listCards()); setError(''); } catch { setError('백업 파일을 복원하지 못했습니다. 파일 형식을 확인해 주세요.'); } event.target.value = ''; };
  return <main><header><small>LINGO LOOP</small><h1>Speak. Notice.<br/>Remember.</h1><p>매일 짧게 말하고, 필요한 단어를 다시 만나요.</p></header>
    <section className="coach"><b>CONVERSATION · {voicePhase}</b><p>{reply}</p><textarea aria-label="영어 문장" value={text} onChange={event => setText(event.target.value)} placeholder="영어로 한 문장을 말하거나 입력하세요"/><div><button className="ghost" onClick={toggleListening}>{voicePhase === 'idle' || voicePhase === 'error' ? '말하기 시작' : '말하기 중지'}</button><button onClick={() => respond(text)}>코치 받기</button></div></section>
    <section className="notes"><b>VOICE NOTES</b><p>음성 메모는 이 브라우저에 보관하고 3일 뒤 앱을 열 때 삭제합니다.</p><button className="line" onClick={toggleRecording}>{recording ? '녹음 중지·저장' : '음성 메모 녹음'}</button>{notes.map(item => <div className="note" key={item.id}><span>{new Date(item.createdAt).toLocaleDateString('ko-KR')}</span><button onClick={() => play(item)}>재생</button><button onClick={() => remove(item.id)}>삭제</button></div>)}</section>
    <section className="review"><b>VOCABULARY REVIEW</b><h2>오늘 복습 {due.length}개</h2>{active ? <><button className="word" onClick={() => setRevealed(!revealed)}><strong>{active.front}</strong><span>{revealed ? active.back : '눌러서 뜻 보기'}</span></button>{revealed && <div className="grades">{['again','hard','good','easy'].map(value => <button key={value} onClick={() => grade(value)}>{value}</button>)}</div>}</> : <p>오늘 복습을 마쳤어요. 다음 복습 때 다시 만나요.</p>}</section>
    <section className="notes"><b>DATA BACKUP</b><p>기기를 바꾸기 전 학습 기록을 파일로 백업하세요. 음성 녹음은 포함되지 않습니다.</p><div className="backupActions"><button onClick={exportData}>학습 기록 내보내기</button><button onClick={() => fileInput.current?.click()}>백업 복원</button></div><input ref={fileInput} type="file" accept="application/json" hidden onChange={restoreData}/></section>
    {error && <p role="alert" className="error">{error}</p>}<footer>녹음은 이 앱에서 서버로 업로드하지 않습니다. 브라우저 데이터를 삭제하면 학습 기록과 녹음도 사라집니다.</footer></main>;
}
createRoot(document.getElementById('root')).render(<App/>);
if ('serviceWorker' in navigator && import.meta.env.PROD) navigator.serviceWorker.register(`${import.meta.env.BASE_URL}sw.js`).catch(() => {});
