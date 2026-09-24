import React, { ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
  position?: 'top' | 'bottom' | 'left' | 'right';
  className?: string;
}

export const Tooltip: React.FC<TooltipProps> = ({
  content,
  children,
  position = 'top',
  className = '',
}) => {
  if (!content) {
    return <>{children}</>;
  }

  const getPositionClasses = () => {
    switch (position) {
      case 'bottom':
        return 'top-full left-1/2 -translate-x-1/2 mt-2';
      case 'left':
        return 'right-full top-1/2 -translate-y-1/2 mr-2';
      case 'right':
        return 'left-full top-1/2 -translate-y-1/2 ml-2';
      case 'top':
      default:
        return 'bottom-full left-1/2 -translate-x-1/2 mb-2';
    }
  };

  const getArrowClasses = () => {
    switch (position) {
      case 'bottom':
        return '-top-1 left-1/2 -translate-x-1/2 border-t-0 border-r border-b-0 border-l border-[#1C3945] bg-[#0A1D26] rotate-45';
      case 'left':
        return '-right-1 top-1/2 -translate-y-1/2 border-t border-r border-b-0 border-l-0 border-[#1C3945] bg-[#0A1D26] rotate-45';
      case 'right':
        return '-left-1 top-1/2 -translate-y-1/2 border-t-0 border-r-0 border-b border-l border-[#1C3945] bg-[#0A1D26] rotate-45';
      case 'top':
      default:
        return '-bottom-1 left-1/2 -translate-x-1/2 border-t-0 border-r border-b border-l-0 border-[#1C3945] bg-[#0A1D26] rotate-45';
    }
  };

  return (
    <div className={`relative inline-flex group/tooltip ${className}`}>
      {children}
      <div
        role="tooltip"
        className={`absolute ${getPositionClasses()} z-50 pointer-events-none opacity-0 scale-95 group-hover/tooltip:opacity-100 group-hover/tooltip:scale-100 group-focus-within/tooltip:opacity-100 group-focus-within/tooltip:scale-100 transition-all duration-150 ease-out flex flex-col items-center`}
      >
        <div className="bg-[#0A1D26]/95 backdrop-blur-md text-[#F2F0E8] text-xs font-mono font-medium py-1.5 px-3 rounded-lg border border-[#1C3945] shadow-xl shadow-black/70 whitespace-nowrap tracking-wide flex items-center gap-1.5 group-hover/tooltip:border-[#D9B96E]/50">
          {content}
        </div>
        <div className={`absolute w-2 h-2 ${getArrowClasses()}`} />
      </div>
    </div>
  );
};
