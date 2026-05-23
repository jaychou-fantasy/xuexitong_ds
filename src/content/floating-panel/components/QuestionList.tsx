import React from 'react';
import type { Question, Answer } from '@shared/types';
import QuestionCard from './QuestionCard';

interface QuestionListProps {
  questions: Question[];
  getAnswerForQuestion: (questionId: string) => Answer | undefined;
  isDarkMode: boolean;
}

const QuestionList: React.FC<QuestionListProps> = ({
  questions,
  getAnswerForQuestion,
  isDarkMode,
}) => {
  if (questions.length === 0) {
    return (
      <div className="px-3 py-6 text-center text-sm text-gray-500">
        点击上方按钮提取题目
      </div>
    );
  }

  return (
    <div className="xxt-scroll overflow-y-auto" style={{ maxHeight: '400px' }}>
      {questions.map((q) => (
        <QuestionCard
          key={q.id}
          question={q}
          answer={getAnswerForQuestion(q.id)}
          isDarkMode={isDarkMode}
        />
      ))}
    </div>
  );
};

export default QuestionList;
