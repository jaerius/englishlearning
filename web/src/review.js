import { DefaultScheduler, Rating } from 'ts-fsrs';

const words = [
  ['subtle', '미묘한, 섬세한'],
  ['make a point', '요점을 말하다'],
  ['on the other hand', '반면에'],
  ['curious', '호기심이 많은'],
  ['eventually', '결국'],
  ['figure out', '알아내다'],
  ['consider', '고려하다'],
  ['confident', '자신감 있는'],
  ['improve', '개선하다'],
  ['instead', '대신에'],
  ['opportunity', '기회'],
  ['comfortable', '편안한'],
  ['in advance', '미리'],
  ['prefer', '더 좋아하다'],
  ['worthwhile', '가치 있는'],
];
let schedulerPromise;
const scheduler = () => schedulerPromise ||= DefaultScheduler();
export async function initialCards() { const s = await scheduler(); return words.map(([front, back], index) => ({ id: String(index), front, back, fsrs: s.newCard({ now: new Date() }) })); }
export async function createCard(front, back) { const s = await scheduler(); return { id: crypto.randomUUID(), front: front.trim(), back: back.trim(), fsrs: s.newCard({ now: new Date() }) }; }
const grades = { again: Rating.Again, hard: Rating.Hard, good: Rating.Good, easy: Rating.Easy };
export async function gradeCard(card, grade, now = new Date()) {
  const s = await scheduler();
  const state = { ...card.fsrs, dueAt: new Date(card.fsrs.dueAt), lastReviewAt: card.fsrs.lastReviewAt ? new Date(card.fsrs.lastReviewAt) : null };
  return { ...card, fsrs: s.review({ card: state, grade: grades[grade], now }).card };
}
export async function reviewWithLog(card, grade, now = new Date()) {
  const s = await scheduler();
  const state = { ...card.fsrs, dueAt: new Date(card.fsrs.dueAt), lastReviewAt: card.fsrs.lastReviewAt ? new Date(card.fsrs.lastReviewAt) : null };
  const result = s.review({ card: state, grade: grades[grade], now });
  return { card: { ...card, fsrs: result.card }, revlog: result.revlog };
}
export function dueCards(cards, now = Date.now()) { return cards.filter(card => Date.parse(card.fsrs?.dueAt) <= now); }
