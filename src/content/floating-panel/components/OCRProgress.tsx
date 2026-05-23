import React from 'react';

interface OCRProgressProps {
  current: number;
  total: number;
  isDarkMode: boolean;
}

const OCRProgress: React.FC<OCRProgressProps> = ({
  current,
  total,
  isDarkMode,
}) => {
  const pct = Math.round((current / total) * 100);

  return (
    <div className="px-3 py-2">
      <div className="flex items-center justify-between mb-1">
        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          OCR 识别中...
        </span>
        <span className={`text-xs ${isDarkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          {current}/{total}
        </span>
      </div>
      <div className={`w-full h-1.5 rounded-full overflow-hidden ${
        isDarkMode ? 'bg-gray-700' : 'bg-gray-200'
      }`}>
        <div
          className="h-full bg-blue-500 rounded-full transition-all duration-300"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
};

export default OCRProgress;
