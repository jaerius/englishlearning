export type Word={id:string;word:string;meaning:string;pos:string;example:string;translation:string;level:number;stage:number;wrong:number;spokenExampleEn?:string;writtenExampleEn?:string;usageNoteKo?:string};
export const words:Word[]=[
 {id:'1',word:'subtle',meaning:'미묘한, 섬세한',pos:'adjective',example:'There is a subtle difference between the two ideas.',translation:'두 생각에는 미묘한 차이가 있다.',level:3,stage:0,wrong:0},
 {id:'2',word:'consider',meaning:'고려하다',pos:'verb',example:'Please consider every option before you decide.',translation:'결정하기 전에 모든 선택지를 고려하세요.',level:3,stage:0,wrong:0},
 {id:'3',word:'worthwhile',meaning:'가치 있는',pos:'adjective',example:'Learning a language is a worthwhile challenge.',translation:'언어 학습은 가치 있는 도전이다.',level:4,stage:0,wrong:0},
 {id:'4',word:'eventually',meaning:'결국',pos:'adverb',example:'She eventually found the answer by herself.',translation:'그녀는 결국 스스로 답을 찾았다.',level:3,stage:0,wrong:0},
 {id:'5',word:'figure out',meaning:'알아내다',pos:'phrase',example:'We need to figure out what happened.',translation:'우리는 무슨 일이 있었는지 알아내야 한다.',level:3,stage:0,wrong:0},
 {id:'6',word:'confident',meaning:'자신감 있는',pos:'adjective',example:'I feel more confident when I practise.',translation:'연습하면 더 자신감이 생긴다.',level:2,stage:0,wrong:0},
 {id:'7',word:'opportunity',meaning:'기회',pos:'noun',example:'This is a good opportunity to speak English.',translation:'이것은 영어로 말할 좋은 기회다.',level:2,stage:0,wrong:0},
 {id:'8',word:'in advance',meaning:'미리',pos:'phrase',example:'Book your table in advance.',translation:'테이블을 미리 예약하세요.',level:3,stage:0,wrong:0},
 {id:'9',word:'prefer',meaning:'더 좋아하다',pos:'verb',example:'I prefer tea to coffee in the evening.',translation:'저녁에는 커피보다 차를 더 좋아한다.',level:2,stage:0,wrong:0},
 {id:'10',word:'improve',meaning:'개선하다',pos:'verb',example:'Daily practice will improve your speaking.',translation:'매일 연습하면 말하기가 개선된다.',level:2,stage:0,wrong:0}
];
export const scenarios=[['cafe','카페에서 주문하기','원하는 메뉴와 옵션을 자연스럽게 주문해요.',2],['airport','공항 입국심사','여행 목적과 체류 기간을 설명해요.',3],['hotel','호텔 체크인','예약을 확인하고 요청사항을 말해요.',2],['restaurant','식당 예약','시간과 인원을 정해 예약해요.',3],['directions','길 묻기','목적지까지 가는 방법을 물어봐요.',2],['smalltalk','스몰토크','처음 만난 사람과 편하게 이야기해요.',3],['interview','영어 면접','경험과 강점을 간결하게 말해요.',4],['free','자유 대화','관심 있는 주제로 자유롭게 말해요.',3]] as const;
