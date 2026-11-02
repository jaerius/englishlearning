export type ServerSettings={dailyNewCount:number;reviewCap:number;userLevel:number|null;soundOn:boolean;ttsRate:.8|1;ttsAutoplay:boolean;speakAutoSend:boolean;useTargetWords:boolean;dailyAiTurnLimit:number};
export type StatsSummary={streak:number;masteredCount:number;weeklyAccuracy:number;today:{studiedCount:number;goal:number;dueCount:number;wrongCount:number;aiTurns:number}};
export type WeeklyStat={date:string;studiedCount:number;correctCount:number};
export type MonthlyCost={month:string;inputTokens:number;outputTokens:number;sttRequests:number;estimatedKrw:number;budgetKrw:number};
export type ServerWord={id:string;word:string;pos:string;level:number;cefr:string;meaningKo:string;exampleEn:string;exampleKo:string;hasExample:boolean;isPhrase:boolean};
export type WrongNote={progress:{wordId:string;stage:number;wrongCount:number};word:ServerWord};
export type StudyQuiz={wordId:string;type:'A'|'B'|'C';prompt:string;translation:string;options:string[];answer:string;stage:number};
export type StudySession={sessionId:string;newWords:ServerWord[];quizQueue:StudyQuiz[]};
export type StudyResult={sessionId:string;totalCount:number;correctCount:number;accuracy:number;wrongWords:Array<{id:string;word:string;meaningKo:string}>};
export type StudyAnswer={sessionId:string;wordId:string;quizType:'A'|'B'|'C'|'S';isCorrect:boolean;hintUsed:boolean};
export type LevelQuestion={wordId:string;level:number;word:string;pos:string;options:string[]};
export type SpeakingScenario={id:string;title:string;description:string;level:number;role:string;situation:string;isCustom:boolean};
export type SpeakingSession={id:string;scenarioId:string;cefr:string;targetWords:Array<{id:string;word:string;meaningKo:string}>;messages:Array<{id:string;role:'user'|'ai';text:string}>;usedWordIds:string[];finishedAt:string|null;summary:SpeakingSummary|null};
export type SpeakingSummary={corrections:Array<{original:string;corrected:string;explanationKo:string}>;expressions:Array<{phrase:string;meaningKo:string}>;targetWords:Array<{id:string;word:string;used:boolean}>};
const base=(import.meta.env.VITE_API_BASE_URL as string|undefined)?.replace(/\/$/,'');
export const isApiConfigured=Boolean(base);
export class ApiError extends Error{constructor(public readonly status:number,message:string){super(message)}}
async function request<T>(path:string,init?:RequestInit):Promise<T>{
 if(!base)throw new ApiError(0,'서버 주소가 설정되지 않았어요.');
 const response=await fetch(`${base}/api${path}`,{...init,headers:{'content-type':'application/json',...init?.headers}});
 if(!response.ok){const payload=await response.json().catch(()=>null) as {message?:string}|null;throw new ApiError(response.status,payload?.message||`서버 요청 실패 (${response.status})`)}
 return response.json() as Promise<T>;
}
async function upload<T>(path:string,body:FormData):Promise<T>{
 if(!base)throw new ApiError(0,'서버 주소가 설정되지 않았어요.');
 const response=await fetch(`${base}/api${path}`,{method:'POST',body});
 if(!response.ok){const payload=await response.json().catch(()=>null) as {message?:string}|null;throw new ApiError(response.status,payload?.message||`서버 요청 실패 (${response.status})`)}
 return response.json() as Promise<T>;
}
export const api={
 settings:()=>request<ServerSettings>('/settings'),updateSettings:(value:Partial<ServerSettings>)=>request<ServerSettings>('/settings',{method:'PUT',body:JSON.stringify(value)}),
 resetAll:()=>request<{reset:boolean}>('/settings/reset',{method:'POST',body:JSON.stringify({confirmation:'RESET'})}),
 word:(id:string)=>request<ServerWord&{progress:{stage:number;nextReviewAt:string;correctCount:number;wrongCount:number}|null}>(`/words/${encodeURIComponent(id)}`),
 resetWord:(id:string)=>request(`/user-words/${encodeURIComponent(id)}?action=reset`,{method:'PATCH',body:JSON.stringify({})}),
 flagUnknown:(wordId:string,flaggedUnknown:boolean)=>request(`/user-words/${encodeURIComponent(wordId)}`,{method:'PATCH',body:JSON.stringify({flaggedUnknown})}),
 summary:()=>request<StatsSummary>('/stats/summary'),weekly:()=>request<WeeklyStat[]>('/stats/weekly'),cost:()=>request<MonthlyCost>('/stats/cost'),wrongNotes:(sort='count')=>request<WrongNote[]>(`/review/wrong-notes?sort=${sort}`),words:()=>request<ServerWord[]>('/words'),
 levelQuestions:()=>request<LevelQuestion[]>('/level-test/questions'),
 submitLevel:(answers:Array<{wordId:string;level:number;selectedMeaning:string|null}>)=>request<{level:number;perLevelCorrect:Array<{level:number;correct:number}>}>('/level-test/submit',{method:'POST',body:JSON.stringify({answers})}),
 startStudy:(kind:'daily'|'review',wordIds?:string[])=>request<StudySession>('/study/sessions',{method:'POST',body:JSON.stringify({kind,wordIds})}),
 answer:(answer:StudyAnswer)=>request('/study/answers',{method:'POST',body:JSON.stringify(answer)}),finishStudy:(id:string)=>request<StudyResult>(`/study/sessions/${id}/finish`,{method:'POST'}),
 scenarios:()=>request<SpeakingScenario[]>('/speaking/scenarios'),
 recentSpeaking:()=>request<Array<{id:string;title:string;finishedAt:string;turns:number;summary:SpeakingSummary}>>('/speaking/sessions/recent'),
 targetWords:()=>request<Array<{id:string;word:string;meaningKo:string}>>('/speaking/target-words'),
 customScenario:(text:string,level:number)=>request<SpeakingScenario>('/speaking/scenarios/custom',{method:'POST',body:JSON.stringify({text,level})}),
 startSpeaking:(scenarioId:string,cefr:string,targetWords:Array<{id:string;word:string;meaningKo:string}>)=>request<SpeakingSession>('/speaking/sessions',{method:'POST',body:JSON.stringify({scenarioId,cefr,targetWords})}),
 speakingTurn:(id:string,text:string)=>request<{userText:string;reply:string;usedWords:string[];hasCorrection:boolean;turnsRemaining:number}>(`/speaking/sessions/${id}/turn`,{method:'POST',body:JSON.stringify({text})}),
 transcribe:(id:string,audio:Blob)=>{const form=new FormData();form.append('audio',audio,audio.type==='audio/mp4'?'recording.m4a':'recording.webm');return upload<{text:string}>(`/speaking/sessions/${id}/transcribe`,form)},
 finishSpeaking:(id:string)=>request<SpeakingSession>(`/speaking/sessions/${id}/finish`,{method:'POST'}),
 repeatCheck:(reference:string,text:string)=>request<{transcript:string;matchPercent:number;passed:boolean}>('/speaking/repeat-check',{method:'POST',body:JSON.stringify({reference,text})})
};
