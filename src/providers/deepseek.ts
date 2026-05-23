/**
 * DeepSeek API provider.
 *
 * Implements the AIProvider interface using the DeepSeek API
 * (OpenAI-compatible chat completions endpoint).
 */

import type {
  AIProvider,
  Answer,
  ModelTier,
  Question,
} from '@shared/types';
import {
  getSettings,
  getActiveModel,
} from '@storage/settings';
import {
  buildSystemPrompt,
  buildQuestionsPrompt,
} from './prompt';

const DEFAULT_ENDPOINT = 'https://api.deepseek.com/v1/chat/completions';
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000]; // exponential-ish backoff

export class DeepSeekProvider implements AIProvider {
  readonly name = 'DeepSeek';
  readonly tier: ModelTier;

  private apiKey: string;
  private endpoint: string;
  private model: string;

  constructor(
    apiKey: string,
    tier: ModelTier = 'flash',
    endpoint?: string,
    model?: string,
  ) {
    this.apiKey = apiKey;
    this.tier = tier;
    this.endpoint = endpoint || DEFAULT_ENDPOINT;
    this.model = model || (tier === 'pro' ? 'deepseek-reasoner' : 'deepseek-chat');
  }

  async answer(question: Question): Promise<Answer> {
    const answers = await this.answerBatch([question]);
    return answers[0];
  }

  // Token usage from last request, exposed for cost display
  lastUsage: { promptTokens: number; completionTokens: number } | null = null;

  async answerBatch(questions: Question[]): Promise<Answer[]> {
    const systemPrompt = buildSystemPrompt();
    const userContent = buildQuestionsPrompt(questions);

    const body = JSON.stringify({
      model: this.model,
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userContent },
      ],
      temperature: 0.3,
      max_tokens: 4096,
      stream: false,
    });

    const data = await this.fetchWithRetry(body);

    // Capture token usage
    const usage = data.usage as { prompt_tokens: number; completion_tokens: number } | undefined;
    if (usage) {
      this.lastUsage = {
        promptTokens: usage.prompt_tokens,
        completionTokens: usage.completion_tokens,
      };
    }

    return this.parseResponse(data, questions);
  }

  /**
   * Fetch with retry on network errors and 5xx responses.
   */
  private async fetchWithRetry(body: string): Promise<Record<string, unknown>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        let response: Response;
        try {
          response = await fetch(this.endpoint, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${this.apiKey}`,
            },
            body,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        // Non-retryable errors
        if (response.status === 401 || response.status === 403) {
          throw new Error('API Key 无效，请检查设置');
        }

        // Retryable errors
        if (!response.ok) {
          if (response.status === 429 || response.status >= 500) {
            throw new Error(response.status === 429 ? '请求过于频繁' : `服务器错误 ${response.status}`);
          }
          const errorText = await response.text().catch(() => '');
          throw new Error(`API 错误 (${response.status}): ${errorText}`);
        }

        return await response.json();
      } catch (err: unknown) {
        lastError = err instanceof Error ? err : new Error('未知错误');

        // Don't retry auth errors or client errors (except 429)
        if (lastError.message.includes('API Key') || lastError.message.includes('API 错误')) {
          // Only retry 429 and 5xx, not 4xx
          if (!lastError.message.includes('429') && !lastError.message.includes('服务器错误')) {
            throw lastError;
          }
        }

        const isLast = attempt === MAX_RETRIES;
        if (isLast) {
          throw lastError;
        }

        console.log(`[xuexitong_ds] Retry ${attempt + 1}/${MAX_RETRIES} in ${RETRY_DELAYS[attempt]}ms...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      }
    }

    throw lastError ?? new Error('未知错误');
  }

  /**
   * Parse the DeepSeek API JSON response into Answer[].
   */
  private parseResponse(
    data: Record<string, unknown>,
    questions: Question[],
  ): Answer[] {
    // Extract content from the first choice
    const choices = data.choices as Array<{ message: { content: string } }> | undefined;
    if (!choices || choices.length === 0) {
      throw new Error('AI 未返回有效响应');
    }

    const content = choices[0].message.content.trim();

    // DeepSeek may wrap JSON in markdown code fences — strip them
    let jsonStr = content;
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) {
      jsonStr = fenceMatch[1];
    }

    // Parse JSON
    let parsed: unknown[];
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      // Try to find JSON array in the response
      const arrayMatch = jsonStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        try {
          parsed = JSON.parse(arrayMatch[0]);
        } catch {
          throw new Error(`AI 返回格式异常，无法解析 JSON: ${jsonStr.substring(0, 200)}`);
        }
      } else {
        throw new Error(`AI 返回格式异常，无法解析 JSON: ${jsonStr.substring(0, 200)}`);
      }
    }

    if (!Array.isArray(parsed)) {
      throw new Error('AI 返回的不是 JSON 数组');
    }

    // Map response items to Answer objects
    return questions.map((q) => {
      const item = (parsed as Array<Record<string, unknown>>).find(
        (it) => String(it.qid) === String(q.index),
      );

      if (!item) {
        return {
          questionId: q.id,
          answer: '?',
          confidence: 0,
          reason: 'AI 未返回该题答案',
        };
      }

      return {
        questionId: q.id,
        answer: String(item.answer ?? '?'),
        confidence: Math.min(100, Math.max(0, Number(item.confidence) || 0)),
        reason: String(item.reason ?? ''),
      };
    });
  }
}

/**
 * Factory: create a DeepSeekProvider from stored settings.
 */
export async function createDeepSeekProvider(): Promise<DeepSeekProvider | null> {
  const settings = await getSettings();
  if (!settings.deepseekApiKey) return null;

  const model = settings.selectedModel === 'pro'
    ? settings.deepseekProModel
    : settings.deepseekFlashModel;

  return new DeepSeekProvider(
    settings.deepseekApiKey,
    settings.selectedModel,
    undefined,
    model,
  );
}
