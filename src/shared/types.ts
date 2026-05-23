/**
 * Shared type definitions for xuexitong_ds.
 *
 * All modules reference these types to maintain consistency
 * across the extension.
 */

// ---- Question Types ----

export type QuestionType = 'single_choice' | 'multi_choice' | 'true_false' | 'fill_blank' | 'short_answer';

export interface QuestionOption {
  label: string;     // e.g. "A", "B", "C", "D"
  text: string;      // option content
  selected?: boolean; // true if user has selected this on the page
}

export interface Question {
  id: string;
  index: number;          // 1-based position on page
  type: QuestionType;
  text: string;           // question body (plain text + OCR-merged text)
  options: QuestionOption[];
  hasImage: boolean;
  imageUrls: string[];    // URLs of question images found
}

// ---- Answer Types ----

export interface Answer {
  questionId: string;
  answer: string;         // e.g. "C" or "AB" for multi-choice
  confidence: number;     // 0–100
  reason: string;         // short explanation
  pageAnswer?: string;    // user's current answer on the page, for comparison
}

export interface PageResult {
  questions: Question[];
  answers: Answer[];
  timestamp: number;
}

// ---- AI Provider Types ----

export type ModelTier = 'flash' | 'pro';

export interface ProviderConfig {
  apiKey: string;
  endpoint: string;
  model: string;
  tier: ModelTier;
}

export interface AIProvider {
  readonly name: string;
  readonly tier: ModelTier;
  answer(question: Question): Promise<Answer>;
  answerBatch(questions: Question[]): Promise<Answer[]>;
}

// ---- Extension Message Types ----

export type ExtensionMessageType =
  | 'EXTRACT_QUESTIONS'
  | 'SEND_TO_AI'
  | 'GET_API_CONFIG'
  | 'SET_API_CONFIG'
  | 'GET_RESULT';

export interface ExtensionMessage {
  type: ExtensionMessageType;
  payload?: unknown;
}

// ---- Provider Types ----

export type ProviderType = 'deepseek' | 'openai' | 'gemini';

// ---- Storage Types ----

export interface ExtensionSettings {
  provider: ProviderType;
  deepseekApiKey: string;
  deepseekFlashModel: string;
  deepseekProModel: string;
  openaiApiKey: string;
  openaiFlashModel: string;
  openaiProModel: string;
  geminiApiKey: string;
  geminiFlashModel: string;
  geminiProModel: string;
  selectedModel: ModelTier;
}

// ---- Platform Types ----

export interface PlatformAdapter {
  readonly name: string;
  /** Detect if current page belongs to this platform */
  detect(): boolean;
  /** Extract all question blocks from the current DOM */
  extractQuestions(): Question[];
}
