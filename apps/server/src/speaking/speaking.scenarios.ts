import type { SpeakingScenario } from './speaking.models.js';

export const DEFAULT_SCENARIOS: SpeakingScenario[] = [
  { id: 'cafe', title: '카페에서 주문하기', description: '메뉴를 묻고 원하는 음료를 주문해요', level: 1, role: 'a cafe barista', situation: 'The learner orders a drink at a cafe.', isCustom: false },
  { id: 'immigration', title: '공항 입국심사', description: '방문 목적과 체류 기간을 설명해요', level: 2, role: 'an immigration officer', situation: 'The learner enters a country at airport immigration.', isCustom: false },
  { id: 'hotel', title: '호텔 체크인', description: '예약을 확인하고 필요한 것을 요청해요', level: 2, role: 'a hotel receptionist', situation: 'The learner checks in to a hotel.', isCustom: false },
  { id: 'restaurant', title: '식당 예약', description: '시간과 인원을 정해 자리를 예약해요', level: 2, role: 'a restaurant host', situation: 'The learner reserves a restaurant table.', isCustom: false },
  { id: 'directions', title: '길 묻기', description: '목적지로 가는 길을 묻고 확인해요', level: 1, role: 'a helpful local', situation: 'The learner asks for directions in a city.', isCustom: false },
  { id: 'small-talk', title: '스몰토크', description: '처음 만난 사람과 자연스럽게 대화해요', level: 3, role: 'a friendly acquaintance', situation: 'The learner makes small talk at a social event.', isCustom: false },
  { id: 'interview', title: '영어 면접', description: '경험과 강점을 짧고 분명하게 말해요', level: 4, role: 'a job interviewer', situation: 'The learner answers questions in a job interview.', isCustom: false },
  { id: 'free-talk', title: '자유 대화', description: '관심 있는 주제로 편하게 이야기해요', level: 1, role: 'a supportive conversation partner', situation: 'The learner chooses the topic for an open conversation.', isCustom: false },
];
