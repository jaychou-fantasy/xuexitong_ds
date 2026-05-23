import React from 'react';

interface ActionButtonsProps {
  onExtract: () => void;
  onAIAnswer: () => void;
  onOCR: () => void;
  onToggleSettings: () => void;
  extracting: boolean;
  aiLoading: boolean;
  aiElapsed: number;
  ocrRunning: boolean;
  imageQuestionCount: number;
  ocrDone: boolean;
  questionCount: number | null;
  answersReady: boolean;
  showSettings: boolean;
}

const ActionButtons: React.FC<ActionButtonsProps> = ({
  onExtract,
  onAIAnswer,
  onOCR,
  onToggleSettings,
  extracting,
  aiLoading,
  aiElapsed,
  ocrRunning,
  imageQuestionCount,
  ocrDone,
  questionCount,
  answersReady,
  showSettings,
}) => {
  return (
    <div className="px-3 py-2 space-y-2">
      {/* Extract button — always visible */}
      <button
        onClick={onExtract}
        disabled={extracting}
        className="w-full py-2 px-4 bg-blue-600 hover:bg-blue-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
      >
        {extracting ? (
          <span className="flex items-center justify-center gap-2">
            <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
            </svg>
            提取中...
          </span>
        ) : questionCount !== null ? (
          `已提取 ${questionCount} 题`
        ) : (
          '提取当前页面题目'
        )}
      </button>

      {/* AI Answer button — visible after extraction */}
      {questionCount !== null && questionCount > 0 && (
        <button
          onClick={onAIAnswer}
          disabled={aiLoading}
          className="w-full py-2 px-4 bg-green-600 hover:bg-green-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {aiLoading ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              AI 答题中... ({aiElapsed}s)
            </span>
          ) : answersReady ? (
            '重新 AI 答题'
          ) : (
            'AI 答题'
          )}
        </button>
      )}

      {/* OCR button — visible when image questions exist */}
      {imageQuestionCount > 0 && (
        <button
          onClick={onOCR}
          disabled={ocrRunning}
          className="w-full py-2 px-4 bg-yellow-600 hover:bg-yellow-500 disabled:bg-gray-600 disabled:cursor-not-allowed text-white text-sm font-medium rounded-lg transition-colors"
        >
          {ocrRunning ? (
            <span className="flex items-center justify-center gap-2">
              <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              OCR 识别中...
            </span>
          ) : ocrDone ? (
            `OCR 完成 (${imageQuestionCount} 题图片)`
          ) : (
            `OCR 识别图片 (${imageQuestionCount} 题)`
          )}
        </button>
      )}

      {/* Settings toggle */}
      <button
        onClick={onToggleSettings}
        className={`w-full py-1.5 text-xs rounded-lg transition-colors ${
          showSettings
            ? 'bg-gray-700 text-gray-200'
            : 'bg-transparent text-gray-500 hover:text-gray-300'
        }`}
      >
        {showSettings ? '收起设置' : '设置'}
      </button>
    </div>
  );
};

export default ActionButtons;
