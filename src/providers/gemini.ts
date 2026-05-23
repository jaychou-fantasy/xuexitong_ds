/**
 * Google Gemini API provider.
 *
 * Implements the AIProvider interface using the Gemini generateContent API.
 * API format differs from OpenAI-compatible providers.
 */

import type { AIProvider, Answer, ModelTier, Question } from '@shared/types';
import { buildSystemPrompt, buildQuestionsPrompt } from './prompt';

const API_BASE = 'https://generativelanguage.googleapis.com/v1beta';
const REQUEST_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 3;
const RETRY_DELAYS = [1000, 2000, 4000];

export class GeminiProvider implements AIProvider {
  readonly name = 'Gemini';
  readonly tier: ModelTier;
  lastUsage: { promptTokens: number; completionTokens: number } | null = null;

  private apiKey: string;
  private model: string;

  constructor(apiKey: string, tier: ModelTier = 'flash', model?: string) {
    this.apiKey = apiKey;
    this.tier = tier;
    this.model = model || (tier === 'pro' ? 'gemini-2.5-pro' : 'gemini-2.0-flash');
  }

  async answer(question: Question): Promise<Answer> {
    const answers = await this.answerBatch([question]);
    return answers[0];
  }

  async answerBatch(questions: Question[]): Promise<Answer[]> {
    const systemPrompt = buildSystemPrompt();
    const userContent = buildQuestionsPrompt(questions);

    const url = `${API_BASE}/models/${this.model}:generateContent?key=${this.apiKey}`;

    const body = JSON.stringify({
      systemInstruction: {
        parts: [{ text: systemPrompt }],
      },
      contents: [
        {
          role: 'user',
          parts: [{ text: userContent }],
        },
      ],
      generationConfig: {
        temperature: 0.3,
        maxOutputTokens: 4096,
      },
    });

    const data = await this.fetchWithRetry(url, body);

    // Capture token usage
    const usageMeta = data.usageMetadata as
      | { promptTokenCount: number; candidatesTokenCount: number }
      | undefined;
    if (usageMeta) {
      this.lastUsage = {
        promptTokens: usageMeta.promptTokenCount,
        completionTokens: usageMeta.candidatesTokenCount,
      };
    }

    return this.parseResponse(data, questions);
  }

  private async fetchWithRetry(url: string, body: string): Promise<Record<string, unknown>> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

        let response: Response;
        try {
          response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body,
            signal: controller.signal,
          });
        } finally {
          clearTimeout(timeoutId);
        }

        if (response.status === 401 || response.status === 403) {
          throw new Error('API Key 无效，请检查设置');
        }

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

        if (lastError.message.includes('API Key') || lastError.message.includes('API 错误')) {
          if (!lastError.message.includes('429') && !lastError.message.includes('服务器错误')) {
            throw lastError;
          }
        }

        const isLast = attempt === MAX_RETRIES;
        if (isLast) throw lastError;

        console.log(`[xuexitong_ds] Gemini retry ${attempt + 1}/${MAX_RETRIES}...`);
        await new Promise((r) => setTimeout(r, RETRY_DELAYS[attempt]));
      }
    }

    throw lastError ?? new Error('未知错误');
  }

  private parseResponse(
    data: Record<string, unknown>,
    questions: Question[],
  ): Answer[] {
    const candidates = data.candidates as Array<{
      content: { parts: Array<{ text: string }> };
    }> | undefined;

    if (!candidates || candidates.length === 0) {
      throw new Error('AI 未返回有效响应');
    }

    const content = candidates[0].content.parts
      .map((p) => p.text)
      .join('')
      .trim();

    // Strip markdown code fences
    let jsonStr = content;
    const fenceMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
    if (fenceMatch) jsonStr = fenceMatch[1];

    let parsed: unknown[];
    try {
      parsed = JSON.parse(jsonStr);
    } catch {
      const arrayMatch = jsonStr.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (arrayMatch) {
        try {
          parsed = JSON.parse(arrayMatch[0]);
        } catch {
          throw new Error(`AI 返回格式异常: ${jsonStr.substring(0, 200)}`);
        }
      } else {
        throw new Error(`AI 返回格式异常: ${jsonStr.substring(0, 200)}`);
      }
    }

    if (!Array.isArray(parsed)) {
      throw new Error('AI 返回的不是 JSON 数组');
    }

    return questions.map((q) => {
      const item = (parsed as Array<Record<string, unknown>>).find(
        (it) => String(it.qid) === String(q.index),
      );
      if (!item) {
        return { questionId: q.id, answer: '?', confidence: 0, reason: 'AI 未返回该题答案' };
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
