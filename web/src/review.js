import { DefaultScheduler, Rating } from 'ts-fsrs';

const words = [
  ['subtle', '미묘한, 섬세한'],
  ['make a point', '요점을 말하다'],
  ['on the other hand', '반면에'],
];
let schedulerPromise;
const scheduler = () => schedulerPromise ||= DefaultScheduler();
export async function initialCards() { const s = await scheduler(); return words.map(([front, back], index) => ({ id: String(index), front, back, fsrs: s.newCard({ now: new Date() }) })); }
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
