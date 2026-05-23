/**
 * Chaoxing DOM selectors and type mappings.
 *
 * All knowledge about Chaoxing's DOM structure lives here.
 * If Chaoxing changes their markup, update these selectors.
 */

// ---- DOM Selectors ----

export const SELECTORS = {
  /** Main assignment/exam container */
  mainContainer: '.fanyaMarking.TiMu',
  /** Left panel containing question items */
  leftPanel: '.fanyaMarking_left',
  /** Each question block */
  questionItem: '.questionLi',
  /** Question title area: contains number, type, body */
  questionTitle: '.mark_name',
  /** Question type span e.g. "(单选题)" */
  questionType: '.colorShallow',
  /** Options wrapper inside question */
  optionsContainer: '.stem_answer',
  /** Individual option div with role="radio" */
  optionItem: '[role="radio"]',
  /** Option letter span (data attr holds real answer key) */
  optionLabel: 'span.num_option',
  /** Option text div */
  optionText: '.answer_p',
  /** Hidden input storing the selected answer value */
  answerInput: 'input[id^="answer"]:not([id^="answertype"])',
  /** Hidden input storing the question type code */
  answerTypeInput: 'input[id^="answertype"]',
  /** Right-side question number panel */
  rightPanel: '.fanyaMarking_right',
  /** Question number indicator in right panel */
  topicNumber: '.topicNumber',
} as const;

// ---- Attribute Keys ----

export const ATTR = {
  questionType: 'typename',
  questionData: 'data',
  radioQuestionId: 'qid',
  radioQuestionType: 'qtype',
  optionData: 'data',
} as const;

// ---- Question Type Mapping ----

/** Maps Chaoxing typename attribute values to our QuestionType */
export const TYPE_MAP: Record<string, import('@shared/types').QuestionType> = {
  '单选题': 'single_choice',
  '多选题': 'multi_choice',
  '判断题': 'true_false',
  '填空题': 'fill_blank',
  '简答题': 'short_answer',
};

/**
 * Maps Chaoxing hidden-input type codes to our QuestionType (fallback).
 * Values come from `<input name="typeXXX" value="N">` inside each question form:
 *   0 = 单选题, 1 = 多选题, 2 = 填空题, 3 = 判断题, 4 = 简答题
 */
export const QTYPE_MAP: Record<string, import('@shared/types').QuestionType> = {
  '0': 'single_choice',
  '1': 'multi_choice',
  '2': 'fill_blank',
  '3': 'true_false',
  '4': 'short_answer',
};

// ---- Page Modes ----

export type PageMode = 'dowork' | 'view' | 'unknown';

// ---- Selector for checked option ----

export const CHECKED_CLASS = 'check_answer';
