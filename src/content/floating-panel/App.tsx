import React, { useState, useCallback, useRef, useEffect } from 'react';
import type { Question, Answer, QuestionOption } from '@shared/types';
import { extractQuestions, findQuestionImages, findOptionImages } from '@platforms/chaoxing/extractor';
import { getPageMode } from '@platforms/chaoxing/detector';
import { DeepSeekProvider } from '@providers/deepseek';
import { GeminiProvider } from '@providers/gemini';
import { getApiKey, getActiveProvider, getActiveModel, getSelectedTier } from '@storage/settings';
import { recognizeImages, preloadOCRLanguages } from '@ocr/tesseract';
import PanelHeader from './components/PanelHeader';
import ActionButtons from './components/ExtractButton';
import QuestionList from './components/QuestionList';
import SettingsPanel from './components/SettingsPanel';
import OCRProgress from './components/OCRProgress';

interface Position {
  x: number;
  y: number;
}

const DEFAULT_POSITION: Position = { x: 16, y: 16 };

const App: React.FC = () => {
  const [questions, setQuestions] = useState<Question[]>([]);
  const [answers, setAnswers] = useState<Answer[]>([]);
  const [loading, setLoading] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiElapsed, setAiElapsed] = useState(0);
  const [aiError, setAiError] = useState<string | null>(null);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isDarkMode, setIsDarkMode] = useState(true);
  const [position, setPosition] = useState<Position>(DEFAULT_POSITION);
  const [pageMode, setPageMode] = useState<string>('');
  const [showSettings, setShowSettings] = useState(false);
  const [ocrRunning, setOcrRunning] = useState(false);
  const [ocrProgress, setOcrProgress] = useState({ current: 0, total: 0 });
  const [usageInfo, setUsageInfo] = useState<{ promptTokens: number; completionTokens: number; cost: string } | null>(null);
  const [visibleAnswers, setVisibleAnswers] = useState<Answer[]>([]);
  const aiRequestId = useRef(0);

  const panelRef = useRef<HTMLDivElement>(null);
  const dragging = useRef(false);
  const dragOffset = useRef<Position>({ x: 0, y: 0 });

  const [ocrPreloadStatus, setOcrPreloadStatus] = useState<string>('');

  useEffect(() => {
    setPageMode(getPageMode());
    // Pre-download OCR language packs in background
    preloadOCRLanguages((status) => {
      if (status === 'done' || status === 'failed') {
        setOcrPreloadStatus(status);
      } else {
        setOcrPreloadStatus(status);
      }
    });
  }, []);

  // ---- Drag Logic ----

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    dragging.current = true;
    dragOffset.current = {
      x: e.clientX - position.x,
      y: e.clientY - position.y,
    };

    const handleMouseMove = (ev: MouseEvent) => {
      if (!dragging.current) return;
      let newX = ev.clientX - dragOffset.current.x;
      let newY = ev.clientY - dragOffset.current.y;

      const panelEl = panelRef.current;
      if (panelEl) {
        const rect = panelEl.getBoundingClientRect();
        newX = Math.max(0, Math.min(newX, window.innerWidth - rect.width));
        newY = Math.max(0, Math.min(newY, window.innerHeight - rect.height));
      }

      setPosition({ x: newX, y: newY });
    };

    const handleMouseUp = () => {
      dragging.current = false;
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [position.x, position.y]);

  // ---- Extraction ----

  const handleExtract = useCallback(() => {
    setLoading(true);
    setAiError(null);
    setTimeout(() => {
      try {
        const extracted = extractQuestions();
        setQuestions(extracted);
        setAnswers([]); // clear old answers on re-extract
        if (isMinimized) setIsMinimized(false);

        // Auto-trigger OCR if image questions found
        const hasImages = extracted.some((q) => q.hasImage);
        if (hasImages) {
          console.log('[xuexitong_ds] Image questions detected, auto-starting OCR...');
          // Delay to let state settle, then run OCR
          setTimeout(() => runOCR(extracted), 200);
        }
      } catch (err) {
        console.error('[xuexitong_ds] Extraction failed:', err);
      } finally {
        setLoading(false);
      }
    }, 100);
  }, [isMinimized]);

  // Run OCR on the given questions and update state
  const runOCR = useCallback(async (currentQuestions: Question[]) => {
    setOcrRunning(true);
    setOcrProgress({ current: 0, total: 0 });

    try {
      const imageQuestions = currentQuestions.filter((q) => q.hasImage);
      const allImages: Array<{
        questionIdx: number;
        optionIdx: number | null;
        img: HTMLImageElement;
      }> = [];

      console.log(`[xuexitong_ds] Scanning ${imageQuestions.length} image questions...`);

      for (const q of imageQuestions) {
        const qImgs = findQuestionImages(q.index);
        console.log(`[xuexitong_ds] Q${q.index}: ${qImgs.length} images in body`);

        for (const img of qImgs) {
          allImages.push({ questionIdx: q.index - 1, optionIdx: null, img });
        }

        for (let oi = 0; oi < q.options.length; oi++) {
          const optImgs = findOptionImages(q.index, oi);
          if (optImgs.length > 0) {
            console.log(`[xuexitong_ds] Q${q.index} option ${q.options[oi].label}: ${optImgs.length} images`);
          }
          for (const img of optImgs) {
            allImages.push({ questionIdx: q.index - 1, optionIdx: oi, img });
          }
        }
      }

      console.log(`[xuexitong_ds] Total images to OCR: ${allImages.length}`);

      if (allImages.length === 0) {
        console.log('[xuexitong_ds] No images found to OCR');
        setOcrRunning(false);
        return;
      }

      const texts = await recognizeImages(
        allImages.map((x) => x.img),
        (current, total) => setOcrProgress({ current, total }),
      );

      // Merge results
      const updated = [...currentQuestions];
      for (let i = 0; i < allImages.length; i++) {
        const { questionIdx, optionIdx } = allImages[i];
        const ocrText = texts[i];
        if (!ocrText) continue;

        const q = { ...updated[questionIdx] };

        if (optionIdx === null) {
          q.text = q.text ? `${q.text}\n[OCR]: ${ocrText}` : ocrText;
        } else {
          const newOptions = [...q.options];
          newOptions[optionIdx] = { ...newOptions[optionIdx], text: ocrText };
          q.options = newOptions;
        }

        updated[questionIdx] = q;
      }

      setQuestions(updated);
      console.log('[xuexitong_ds] OCR complete');
    } catch (err) {
      console.error('[xuexitong_ds] OCR error:', err);
    } finally {
      setOcrRunning(false);
    }
  }, []);

  // ---- AI Answer ----

  const handleAIAnswer = useCallback(async () => {
    // Check API key
    const apiKey = await getApiKey();
    if (!apiKey) {
      setShowSettings(true);
      setAiError('请先设置 API Key');
      return;
    }

    // Prevent concurrent requests
    const reqId = ++aiRequestId.current;

    setAiLoading(true);
    setAiError(null);
    setAiElapsed(0);
    setVisibleAnswers([]);

    const startTime = Date.now();
    const timer = setInterval(() => {
      setAiElapsed(Math.floor((Date.now() - startTime) / 1000));
    }, 1000);

    try {
      const providerType = await getActiveProvider();
      const model = await getActiveModel();
      const tier = await getSelectedTier();

      let provider;
      if (providerType === 'gemini') {
        provider = new GeminiProvider(apiKey, tier, model);
      } else {
        const endpoint = providerType === 'openai'
          ? 'https://api.openai.com/v1/chat/completions'
          : 'https://api.deepseek.com/v1/chat/completions';
        provider = new DeepSeekProvider(apiKey, tier, endpoint, model);
      }

      const results = await provider.answerBatch(questions);
      if (reqId !== aiRequestId.current) return;

      setAnswers(results);

      // Staggered reveal
      for (let i = 0; i <= results.length; i++) {
        if (reqId !== aiRequestId.current) break;
        setVisibleAnswers(results.slice(0, i));
        if (i < results.length) await new Promise((r) => setTimeout(r, 60));
      }

      // Cost
      if (provider.lastUsage) {
        const pt = provider.lastUsage.promptTokens;
        const ct = provider.lastUsage.completionTokens;
        let costStr: string;
        if (providerType === 'gemini') {
          const cost = (pt / 1_000_000) * 0.15 + (ct / 1_000_000) * 0.6;
          costStr = cost < 0.01 ? '< $0.01' : `$${cost.toFixed(2)}`;
        } else if (providerType === 'openai') {
          const cost = (pt / 1_000_000) * 0.15 + (ct / 1_000_000) * 0.6;
          costStr = cost < 0.01 ? '< $0.01' : `$${cost.toFixed(2)}`;
        } else {
          const cost = (pt / 1_000_000) * 1 + (ct / 1_000_000) * 2;
          costStr = cost < 0.01 ? '< ¥0.01' : `¥${cost.toFixed(2)}`;
        }
        setUsageInfo({ promptTokens: pt, completionTokens: ct, cost: costStr });
      }

      if (isMinimized) setIsMinimized(false);
    } catch (err) {
      if (reqId !== aiRequestId.current) return;
      const message = err instanceof Error ? err.message : 'AI 请求失败';
      setAiError(message);
      console.error('[xuexitong_ds] AI error:', err);
    } finally {
      clearInterval(timer);
      if (reqId === aiRequestId.current) setAiLoading(false);
    }
  }, [questions, isMinimized]);

  // ---- OCR ----

  const imageQuestionCount = questions.filter((q) => q.hasImage).length;

  const handleOCR = useCallback(() => {
    runOCR(questions);
  }, [questions, runOCR]);

  // ---- Toggles ----

  const handleToggleDarkMode = useCallback(() => {
    setIsDarkMode((prev) => !prev);
  }, []);

  const handleToggleMinimize = useCallback(() => {
    setIsMinimized((prev) => !prev);
  }, []);

  const handleToggleSettings = useCallback(() => {
    setShowSettings((prev) => !prev);
    setAiError(null);
  }, []);

  // ---- Helpers ----

  const getAnswerForQuestion = useCallback(
    (questionId: string): Answer | undefined => {
      return visibleAnswers.find((a) => a.questionId === questionId);
    },
    [visibleAnswers],
  );

  const panelStyle: React.CSSProperties = {
    position: 'fixed',
    left: `${position.x}px`,
    top: `${position.y}px`,
    width: '320px',
    zIndex: 2147483646,
  };

  return (
    <div
      ref={panelRef}
      style={panelStyle}
      className={`rounded-lg shadow-2xl border border-gray-700 overflow-hidden ${
        isDarkMode ? 'bg-gray-900' : 'bg-white'
      }`}
    >
      <PanelHeader
        onMouseDown={handleMouseDown}
        isMinimized={isMinimized}
        onToggleMinimize={handleToggleMinimize}
        isDarkMode={isDarkMode}
        onToggleDarkMode={handleToggleDarkMode}
      />

      {!isMinimized && (
        <div className={isDarkMode ? 'bg-gray-900' : 'bg-white'}>
          {/* Status indicators */}
          <div className={`px-3 pt-2 text-xs ${
            isDarkMode ? 'text-gray-500' : 'text-gray-400'
          }`}>
            {pageMode && (
              <span>模式: {pageMode === 'dowork' ? '作答中' : pageMode === 'view' ? '查看' : '未知'}</span>
            )}
            {ocrPreloadStatus && ocrPreloadStatus !== 'done' && ocrPreloadStatus !== 'failed' && (
              <span className="ml-3 text-blue-400">{ocrPreloadStatus}</span>
            )}
            {ocrPreloadStatus === 'done' && (
              <span className="ml-3 text-green-500">OCR 就绪</span>
            )}
          </div>

          {/* Action buttons */}
          <ActionButtons
            onExtract={handleExtract}
            onAIAnswer={handleAIAnswer}
            onOCR={handleOCR}
            onToggleSettings={handleToggleSettings}
            extracting={loading}
            aiLoading={aiLoading}
            aiElapsed={aiElapsed}
            ocrRunning={ocrRunning}
            imageQuestionCount={imageQuestionCount}
            ocrDone={questions.some((q) =>
              q.hasImage && q.options.some((o) => o.text.trim().length > 0 && !o.text.includes('图片选项')),
            )}
            questionCount={questions.length > 0 ? questions.length : null}
            answersReady={answers.length > 0}
            showSettings={showSettings}
          />

          {/* OCR progress */}
          {ocrRunning && (
            <OCRProgress
              current={ocrProgress.current}
              total={ocrProgress.total}
              isDarkMode={isDarkMode}
            />
          )}

          {/* Settings panel */}
          {showSettings && <SettingsPanel isDarkMode={isDarkMode} />}

          {/* AI Error */}
          {aiError && (
            <div className="mx-3 mb-2 p-2 bg-red-900/50 border border-red-700 rounded text-xs text-red-300">
              {aiError}
            </div>
          )}

          {/* Question list */}
          <QuestionList
            questions={questions}
            getAnswerForQuestion={getAnswerForQuestion}
            isDarkMode={isDarkMode}
          />

          {/* Footer */}
          <div className={`px-3 py-2 text-xs border-t border-gray-700 ${
            isDarkMode ? 'text-gray-600' : 'text-gray-400'
          }`}>
            {usageInfo && (
              <div className="flex items-center justify-between mb-1">
                <span>
                  {usageInfo.promptTokens + usageInfo.completionTokens} tokens
                </span>
                <span className={isDarkMode ? 'text-gray-400' : 'text-gray-500'}>
                  预估费用 {usageInfo.cost}
                </span>
              </div>
            )}
            <p className="text-center">
              {answers.length > 0
                ? 'AI 作答建议已生成，请手动选择并提交'
                : questions.length > 0
                  ? '已提取题目，点击 AI 答题获取建议'
                  : '请点击按钮提取当前页面的题目'}
            </p>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
