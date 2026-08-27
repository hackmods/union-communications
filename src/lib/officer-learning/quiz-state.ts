export type QuizUiState = {
  answers: Record<string, string>;
  submitted: boolean;
};

/** Pure reset used by ModuleQuiz Try again + unit tests. */
export function resetQuizState(): QuizUiState {
  return { answers: {}, submitted: false };
}
