/**
 * Chaoxing page detection.
 *
 * Determines whether the current page is a Chaoxing
 * exam/homework page and if so, what mode it's in.
 */

import { SELECTORS } from './constants';
import type { PageMode } from './constants';

/**
 * Check if the current hostname belongs to Chaoxing.
 */
export function isChaoxingPage(): boolean {
  return /chaoxing\.com$/.test(window.location.hostname);
}

/**
 * Determine the page mode based on DOM markers.
 *
 * - 'dowork': doing homework/exam — has interactive radio/checkbox options
 * - 'view':   viewing submitted work — has answer + right/wrong indicators
 * - 'unknown': can't determine mode
 */
export function getPageMode(): PageMode {
  if (!hasMainContainer()) return 'unknown';

  // If the page has role="radio" elements, it's interactive (dowork)
  const radioOptions = document.querySelectorAll(SELECTORS.optionItem);
  if (radioOptions.length > 0) return 'dowork';

  // If the page has answer indicators (.mark_answer), it's a view page
  const answerAreas = document.querySelectorAll('.mark_answer');
  if (answerAreas.length > 0) return 'view';

  return 'unknown';
}

/**
 * Quick check: does the page contain the main Chaoxing question container?
 */
export function hasMainContainer(): boolean {
  return document.querySelector(SELECTORS.mainContainer) !== null;
}

/**
 * Quick check: are there question blocks on the page?
 */
export function hasQuestions(): boolean {
  return document.querySelectorAll(SELECTORS.questionItem).length > 0;
}

/**
 * Get the total count of question blocks found.
 */
export function getQuestionCount(): number {
  return document.querySelectorAll(SELECTORS.questionItem).length;
}
