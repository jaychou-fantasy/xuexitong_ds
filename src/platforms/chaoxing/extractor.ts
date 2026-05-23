/**
 * Chaoxing DOM → Question[] extractor.
 *
 * Parses the page DOM and produces structured Question objects
 * using selectors from constants.ts.
 */

import type { Question, QuestionOption, QuestionType } from '@shared/types';
import {
  SELECTORS,
  ATTR,
  TYPE_MAP,
  QTYPE_MAP,
  CHECKED_CLASS,
} from './constants';

/**
 * Extract all questions from the current page DOM.
 */
export function extractQuestions(): Question[] {
  const questionElements = document.querySelectorAll(SELECTORS.questionItem);
  const questions: Question[] = [];

  questionElements.forEach((el, index) => {
    const question = parseQuestionElement(el, index);
    if (question) {
      questions.push(question);
    }
  });

  return questions;
}

/**
 * Parse a single .questionLi DOM element into a Question.
 */
function parseQuestionElement(
  el: Element,
  index: number,
): Question | null {
  const id = extractId(el, index);
  const type = extractType(el);
  const text = extractQuestionText(el);
  const options = extractOptions(el, type);
  const hasImage = hasQuestionImage(el);
  const imageUrls = extractImageUrls(el);

  return {
    id,
    index: index + 1,
    type,
    text,
    options,
    hasImage,
    imageUrls,
  };
}

// ---- Private Helpers ----

function extractId(el: Element, index: number): string {
  const id = el.getAttribute('id');
  if (id && /^question\d+$/.test(id)) return id;
  // Fallback: use the data attribute on the element itself
  const dataId = el.getAttribute(ATTR.questionData);
  if (dataId) return `question${dataId}`;
  // Last resort
  return `question_auto_${index}`;
}

function extractType(el: Element): QuestionType {
  // Primary: hidden inputs inside the question form (most reliable on exam pages)
  // <input name="typeNameXXX" value="单选题|填空题|判断题|...">
  // <input name="typeXXX" value="0|1|2|3|4|...">
  const form = el.querySelector('form');
  if (form) {
    const typeNameInput = form.querySelector<HTMLInputElement>(
      'input[name^="typeName"]',
    );
    if (typeNameInput && typeNameInput.value in TYPE_MAP) {
      return TYPE_MAP[typeNameInput.value];
    }

    const typeCodeInput = form.querySelector<HTMLInputElement>(
      'input[name^="type"]:not([name^="typeName"])',
    );
    if (typeCodeInput && typeCodeInput.value in QTYPE_MAP) {
      return QTYPE_MAP[typeCodeInput.value];
    }
  }

  // Secondary: typename attribute on the questionLi
  const typename = el.getAttribute(ATTR.questionType);
  if (typename && typename in TYPE_MAP) {
    return TYPE_MAP[typename];
  }

  // Tertiary: .colorShallow span text e.g. "(单选题, 3.0分)"
  const typeSpan = el.querySelector(SELECTORS.questionType);
  if (typeSpan) {
    const raw = typeSpan.textContent?.trim() ?? '';
    const cleaned = raw.replace(/^\(|\)$/g, '').split(/[,，]/)[0]; // "单选题"
    if (cleaned in TYPE_MAP) return TYPE_MAP[cleaned];
  }

  // Last resort: qtype on first radio option (legacy pages)
  const firstRadio = el.querySelector(SELECTORS.optionItem);
  if (firstRadio) {
    const qtype = firstRadio.getAttribute(ATTR.radioQuestionType);
    if (qtype && qtype in QTYPE_MAP) return QTYPE_MAP[qtype];
  }

  return 'single_choice';
}

function extractQuestionText(el: Element): string {
  const titleEl = el.querySelector(SELECTORS.questionTitle);
  if (!titleEl) return '(题目文本为空)';

  // Clone to avoid mutating live DOM
  const clone = titleEl.cloneNode(true) as HTMLElement;

  // Remove the type indicator span (.colorShallow)
  const typeSpan = clone.querySelector(SELECTORS.questionType);
  if (typeSpan) typeSpan.remove();

  // Remove leading number like "1. "
  let text = clone.textContent?.trim() ?? '';
  text = text.replace(/^\d+\.\s*/, '');

  return text || '(题目文本为空)';
}

function extractOptions(el: Element, type: QuestionType): QuestionOption[] {
  // 填空题: each .sub_que_div is a blank placeholder
  if (type === 'fill_blank') {
    return extractFillBlankOptions(el);
  }

  // 单选/多选/判断: all use role="radio" option elements
  const optionElements = el.querySelectorAll(SELECTORS.optionItem);
  const options: QuestionOption[] = [];

  optionElements.forEach((opt) => {
    const option = parseOptionElement(opt);
    if (option) options.push(option);
  });

  // Chaoxing shuffles the DOM order of options but displays them
  // with sequential A/B/C/D labels. Sort by label so our panel
  // matches what the user sees on the page.
  options.sort((a, b) => a.label.localeCompare(b.label));

  return options;
}

/** Parse blank placeholders from a 填空题 question. */
function extractFillBlankOptions(el: Element): QuestionOption[] {
  const blankDivs = el.querySelectorAll('.sub_que_div');
  const options: QuestionOption[] = [];

  blankDivs.forEach((div, i) => {
    const labelSpan = div.querySelector('.tiankong');
    const label = labelSpan?.textContent?.trim() || `第${i + 1}空`;

    // Read existing user answer from UEditor iframe body
    let text = '';
    const iframe = div.querySelector('iframe');
    if (iframe?.contentDocument?.body) {
      text = iframe.contentDocument.body.textContent?.trim() || '';
    }

    options.push({ label, text });
  });

  return options;
}

function parseOptionElement(opt: Element): QuestionOption | null {
  const labelSpan = opt.querySelector(SELECTORS.optionLabel);
  if (!labelSpan) return null;

  // The span's text content is the displayed label (A/B/C/D in visual order).
  // The span's data attribute is the real answer key — the page shuffles
  // DOM order but keeps visual labels sequential. We use the displayed
  // label so options sort to A/B/C/D order matching what the user sees.
  const displayLabel = labelSpan.textContent?.trim() ?? '?';
  const realKey = labelSpan.getAttribute(ATTR.optionData) ?? displayLabel;

  // Option text from .answer_p div
  const textDiv = opt.querySelector(SELECTORS.optionText);
  const text = textDiv?.textContent?.trim() ?? '';

  // Check if user has selected this option on the page
  const selected = labelSpan.classList.contains(CHECKED_CLASS);

  return { label: displayLabel, text, selected };
}

function hasQuestionImage(el: Element): boolean {
  return el.querySelector('img') !== null;
}

function extractImageUrls(el: Element): string[] {
  const imgs = el.querySelectorAll('img');
  return Array.from(imgs)
    .map((img) => img.getAttribute('src') ?? '')
    .filter((src) => src.length > 0);
}

/**
 * Get the currently selected answer for a question, if any.
 *
 * For single/multi/true_false: reads the option span with .check_answer
 * class and returns its data attribute (e.g. "A", "true").
 * For fill_blank: reads text from each UEditor iframe body.
 *
 * Returns empty string if unanswered.
 */
export function getSelectedAnswer(questionId: string): string {
  const numericId = questionId.replace('question', '');
  const el = document.getElementById(`sigleQuestionDiv_${numericId}`);
  if (!el) return '';

  // Fill-blank: read user answers from UEditor iframes
  const blankDivs = el.querySelectorAll('.sub_que_div');
  if (blankDivs.length > 0) {
    const answers: string[] = [];
    blankDivs.forEach((div) => {
      const iframe = div.querySelector('iframe');
      let text = '';
      try {
        text = iframe?.contentDocument?.body?.textContent?.trim() || '';
      } catch {
        // same-origin restriction — silently skip
      }
      if (text) answers.push(text);
    });
    return answers.join('; ');
  }

  // Single / multi / true_false: find the checked option
  const checked = el.querySelector<HTMLElement>(
    `.choice${numericId}.${CHECKED_CLASS}`,
  );
  if (checked) {
    return checked.getAttribute('data') ?? '';
  }

  // Fallback: hidden answer input (may contain correct answer, not user's)
  const hidden = el.querySelector<HTMLInputElement>(
    `input[id="answer${numericId}"]`,
  );
  return hidden?.value ?? '';
}

/**
 * Get the question type code from the hidden input in the question form.
 */
export function getAnswerTypeCode(questionId: string): string {
  const numericId = questionId.replace('question', '');
  const el = document.getElementById(`sigleQuestionDiv_${numericId}`);
  if (!el) return '';
  const input = el.querySelector<HTMLInputElement>(
    'input[name^="type"]:not([name^="typeName"])',
  );
  return input?.value ?? '';
}

/**
 * Find all <img> elements within a question block.
 * Filters out icons and very small images (< 30px in either dimension).
 * Used by the OCR pipeline to get actual DOM elements for recognition.
 */
export function findQuestionImages(questionIndex: number): HTMLImageElement[] {
  const questionElements = document.querySelectorAll(SELECTORS.questionItem);
  const el = questionElements[questionIndex - 1]; // 1-based index
  if (!el) return [];

  const imgs = el.querySelectorAll('img');
  return Array.from(imgs).filter(isContentImage);
}

/**
 * Find <img> elements within a specific option of a question.
 */
export function findOptionImages(
  questionIndex: number,
  optionIndex: number,
): HTMLImageElement[] {
  const questionElements = document.querySelectorAll(SELECTORS.questionItem);
  const el = questionElements[questionIndex - 1];
  if (!el) return [];

  const options = el.querySelectorAll(SELECTORS.optionItem);
  const opt = options[optionIndex];
  if (!opt) return [];

  const imgs = opt.querySelectorAll('img');
  return Array.from(imgs).filter(isContentImage);
}

/**
 * Filter out icons, spacers, and other non-content images.
 * Checks multiple size sources since images may not be fully loaded.
 */
function isContentImage(img: HTMLImageElement): boolean {
  const w = img.naturalWidth || img.clientWidth || img.width || 0;
  const h = img.naturalHeight || img.clientHeight || img.height || 0;
  // Very small images are likely icons/spacers
  if (w > 0 && h > 0 && (w < 20 || h < 20)) return false;
  // If all size sources are 0, include it anyway (image not loaded yet)
  return true;
}
