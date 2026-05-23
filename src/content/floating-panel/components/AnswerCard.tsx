import React from 'react';
import type { Answer } from '@shared/types';

interface AnswerCardProps {
  answer: Answer;
  isDarkMode: boolean;
  hasImage?: boolean;
}

const AnswerCard: React.FC<AnswerCardProps> = ({ answer, isDarkMode, hasImage }) => {
  const confidenceColor =
    answer.confidence >= 80
      ? 'text-green-400'
      : answer.confidence >= 60
        ? 'text-yellow-400'
        : 'text-red-400';

  const confidenceLabel =
    answer.confidence >= 80 ? '高'
      : answer.confidence >= 60 ? '中'
        : '低';

  const bgClass = isDarkMode ? 'bg-gray-800/50' : 'bg-gray-50';
  const isLongReason = answer.reason && answer.reason.length > 25;

  return (
    <div className={`mt-2 p-2 rounded ${bgClass} border-l-2 ${
      answer.confidence >= 80
        ? 'border-green-500'
        : answer.confidence >= 60
          ? 'border-yellow-500'
          : 'border-red-500'
    }`}>
      {/* Answer header */}
      <div className="flex items-center gap-2">
        <span className="text-sm font-bold text-blue-400">
          推荐: {answer.answer}
        </span>
        <span className={`text-xs ${confidenceColor}`} title="AI 对自己答案的把握程度">
          置信度{confidenceLabel} {answer.confidence}%
        </span>
      </div>

      {/* Reasoning */}
      {answer.reason && (
        <p className={`mt-1 ${isLongReason ? 'text-xs' : 'text-xs'} leading-relaxed ${
          isDarkMode ? 'text-gray-300' : 'text-gray-600'
        }`}>
          {answer.reason}
        </p>
      )}

      {/* OCR warning for image questions */}
      {hasImage && (
        <p className="mt-2 text-[10px] leading-relaxed text-yellow-500/80">
          ⚠ 本题含图片，OCR 识别文字可能有误，请注意甄别选项内容与原文是否一致。
        </p>
      )}

      {/* Low confidence warning */}
      {answer.confidence < 80 && answer.confidence > 0 && (
        <p className="mt-1 text-[10px] text-red-400/70">
          置信度较低，建议结合自身知识判断
        </p>
      )}
    </div>
  );
};

export default AnswerCard;
