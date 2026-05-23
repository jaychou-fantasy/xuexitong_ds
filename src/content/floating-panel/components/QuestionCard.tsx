import React from 'react';
import type { Question, Answer, QuestionType } from '@shared/types';
import AnswerCard from './AnswerCard';

interface QuestionCardProps {
  question: Question;
  answer?: Answer;
  isDarkMode: boolean;
}

const TYPE_LABELS: Record<QuestionType, string> = {
  single_choice: '单选',
  multi_choice: '多选',
  true_false: '判断',
  fill_blank: '填空',
  short_answer: '简答',
};

const TYPE_COLORS: Record<QuestionType, string> = {
  single_choice: 'bg-blue-600',
  multi_choice: 'bg-purple-600',
  true_false: 'bg-green-600',
  fill_blank: 'bg-orange-600',
  short_answer: 'bg-pink-600',
};

const QuestionCard: React.FC<QuestionCardProps> = ({ question, answer, isDarkMode }) => {
  return (
    <div className="px-3 py-2 border-b border-gray-700 last:border-b-0">
      {/* Header: index + type badge */}
      <div className="flex items-center gap-2 mb-1">
        <span className="text-xs font-bold text-gray-400">
          第{question.index}题
        </span>
        <span className={`text-xs px-1.5 py-0.5 rounded ${TYPE_COLORS[question.type]} text-white`}>
          {TYPE_LABELS[question.type]}
        </span>
        {question.hasImage && (
          <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-600 text-white">
            {question.options.every((o) => o.text.trim().length === 0)
              ? '需 OCR'
              : '含图'}
          </span>
        )}
      </div>

      {/* Question text */}
      <p className="text-sm text-gray-200 mb-2 leading-relaxed">
        {question.text}
      </p>

      {/* Options */}
      {question.options.length > 0 && (
        <div className="space-y-0.5">
          {question.options.map((opt) => (
            <div
              key={opt.label}
              className={`flex items-start gap-2 text-sm py-0.5 rounded px-1 -mx-1 ${
                opt.selected
                  ? isDarkMode ? 'bg-blue-900/30' : 'bg-blue-50'
                  : ''
              }`}
            >
              <span className={`font-medium min-w-[1.25rem] ${
                opt.selected ? 'text-blue-300' : 'text-blue-400'
              }`}>
                {opt.label}.
              </span>
              <span className={opt.text.trim() ? 'text-gray-300' : 'text-gray-500 italic'}>
                {opt.text.trim() || '(图片选项)'}
              </span>
              {opt.selected && (
                <span className="text-[10px] text-blue-400 ml-auto">已选</span>
              )}
            </div>
          ))}
        </div>
      )}

      {/* AI Answer */}
      {answer && (
        <AnswerCard
          answer={answer}
          isDarkMode={isDarkMode}
          hasImage={question.hasImage}
        />
      )}
    </div>
  );
};

export default QuestionCard;
