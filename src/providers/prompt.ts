/**
 * Prompt templates for the AI answering pipeline.
 *
 * System and user prompts are constructed here so they can
 * be tuned independently from the provider implementation.
 */

import type { Question, QuestionType } from '@shared/types';

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: '单选题',
  multi_choice: '多选题',
  true_false: '判断题',
  fill_blank: '填空题',
  short_answer: '简答题',
};

const SYSTEM_PROMPT = `你是学习通答题助手。根据题目和选项，选出正确答案。

回复格式必须是严格的 JSON 数组（不要 markdown 代码块，不要其他文字）：
[{"qid":题号(数字),"answer":"选项字母","confidence":置信度(0到100的整数),"reason":"简短解释"}]

规则：
- qid 必须与你收到的题目编号一致
- 单选题 answer 为单个字母如 "A"
- 多选题 answer 为多个字母连写如 "ABD"
- 判断题 answer 为 "√" 或 "×"
- 填空题/简答题 answer 为答案文本
- confidence 高置信度给 85-95，不确定给 60-75
- reason 用中文，普通题 20 字以内
- 若提示"选项为图片无法读取"，answer 填 "?"，confidence 填 0，reason 填 "选项为图片，无法作答"

重要——含图片或 OCR 文本的题目：
- 标注了 [OCR] 的题目，其文本由图片识别而来，可能不准确
- 对此类题目以及不确定的题目，reason 必须写 40-80 字的详细分析：
  分析题干关键信息、每个选项的含义、排除法和推理过程、为什么选该答案
- 不确定的题目（confidence < 80），也要写详细分析`;

/**
 * Build the user message containing all questions.
 */
export function buildQuestionsPrompt(questions: Question[]): string {
  const parts: string[] = [];
  parts.push(`题目数量：${questions.length}\n`);

  for (const q of questions) {
    const typeLabel = TYPE_LABELS[q.type] || q.type;
    parts.push(`第${q.index}题（${typeLabel}）：`);
    parts.push(q.text);

    if (q.options.length > 0) {
      for (const opt of q.options) {
        parts.push(`${opt.label}. ${opt.text}`);
      }
    }

    // For questions with images, add hint that image content is missing
    if (q.hasImage) {
      const imageOptionsCount = q.options.filter(
        (o) => o.text.trim().length === 0,
      ).length;
      if (imageOptionsCount > 0) {
        parts.push('[此题选项为图片，OCR 未提取，选项不可见，请勿猜测]');
      } else {
        parts.push('[此题含图片，OCR 未提取，请根据可见文字推断]');
      }
    }

    parts.push(''); // blank line between questions
  }

  return parts.join('\n');
}

/**
 * Build the system prompt.
 */
export function buildSystemPrompt(): string {
  return SYSTEM_PROMPT;
}
