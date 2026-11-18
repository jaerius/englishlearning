export const VOCABULARY_STUDY_LEVELS = [4, 5, 6] as const;

export function isVocabularyStudyLevel(level: number): level is (typeof VOCABULARY_STUDY_LEVELS)[number] {
  return VOCABULARY_STUDY_LEVELS.some(studyLevel => studyLevel === level);
}

export function vocabularyStudyLevel(level: number | null) {
  return level !== null && isVocabularyStudyLevel(level) ? level : VOCABULARY_STUDY_LEVELS[0];
}
