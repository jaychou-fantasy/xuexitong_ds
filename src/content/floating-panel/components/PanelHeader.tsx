import React from 'react';

interface PanelHeaderProps {
  onMouseDown: (e: React.MouseEvent) => void;
  isMinimized: boolean;
  onToggleMinimize: () => void;
  isDarkMode: boolean;
  onToggleDarkMode: () => void;
}

const PanelHeader: React.FC<PanelHeaderProps> = ({
  onMouseDown,
  isMinimized,
  onToggleMinimize,
  isDarkMode,
  onToggleDarkMode,
}) => {
  return (
    <div
      className="xxt-drag-handle flex items-center justify-between px-3 py-2 bg-gray-800 border-b border-gray-700 rounded-t-lg select-none"
      onMouseDown={onMouseDown}
    >
      <span className="text-sm font-medium text-gray-200">
        学习通 AI 助手
      </span>

      <div className="flex items-center gap-1">
        {/* Dark mode toggle */}
        <button
          onClick={onToggleDarkMode}
          className="p-1 text-gray-400 hover:text-gray-200 rounded transition-colors"
          title={isDarkMode ? '切换亮色模式' : '切换暗色模式'}
        >
          {isDarkMode ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="5"/>
              <path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/>
            </svg>
          )}
        </button>

        {/* Minimize toggle */}
        <button
          onClick={onToggleMinimize}
          className="p-1 text-gray-400 hover:text-gray-200 rounded transition-colors"
          title={isMinimized ? '展开' : '最小化'}
        >
          {isMinimized ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="15 18 9 12 15 6"/>
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="6 9 12 15 18 9"/>
            </svg>
          )}
        </button>
      </div>
    </div>
  );
};

export default PanelHeader;
