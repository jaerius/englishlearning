import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Volume2, Trash2 } from 'lucide-react';
import { api, isApiConfigured, type SavedPhrase } from './api';
import { speakEnglish } from './tts';

export function SavedPhrases() {
  const navigate = useNavigate();
  const [phrases, setPhrases] = useState<SavedPhrase[]>([]);
  const [error, setError] = useState('');
  useEffect(() => {
    if (!isApiConfigured) return;
    void api.phrases().then(setPhrases).catch(e => setError(e instanceof Error ? e.message : '표현을 불러오지 못했어요.'));
  }, []);
  async function remove(id: string) {
    try {
      await api.deletePhrase(id);
      setPhrases(items => items.filter(item => item.id !== id));
    } catch (e) { setError(e instanceof Error ? e.message : '삭제하지 못했어요.'); }
  }
  return <main className="screen savedPhrases">
    <header className="topbar"><button aria-label="뒤로" onClick={() => navigate(-1)}><ArrowLeft /></button><b>저장한 표현</b><span /></header>
    <p className="savedLead">대화에서 찾은 표현을 다시 듣고 익혀 보세요.</p>
    {!isApiConfigured && <p role="status">표현을 저장하려면 학습 서버 연결이 필요해요.</p>}
    {error && <p role="alert">{error}</p>}
    {isApiConfigured && !error && phrases.length === 0 && <p className="savedEmpty">아직 저장한 표현이 없어요. 말하기 대화를 마친 뒤 요약에서 표현을 저장해 보세요.</p>}
    <div className="savedList">{phrases.map(item => <article key={item.id}>
      <div><strong>{item.phrase}</strong><span>{item.meaningKo}</span></div>
      <button aria-label={`${item.phrase} 듣기`} onClick={() => speakEnglish(item.phrase)}><Volume2 /></button>
      <button aria-label={`${item.phrase} 삭제`} onClick={() => void remove(item.id)}><Trash2 /></button>
    </article>)}</div>
  </main>;
}
