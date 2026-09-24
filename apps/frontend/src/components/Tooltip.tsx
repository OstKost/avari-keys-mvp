import React, { ReactNode, useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';

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
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);
  const [coords, setCoords] = useState<{
    top: number;
    left: number;
    actualPosition: 'top' | 'bottom' | 'left' | 'right';
    arrowLeft?: number;
    arrowTop?: number;
  }>({
    top: 0,
    left: 0,
    actualPosition: position,
  });

  const updatePosition = useCallback(() => {
    if (!triggerRef.current || !tooltipRef.current) return;

    const triggerRect = triggerRef.current.getBoundingClientRect();
    const tooltipRect = tooltipRef.current.getBoundingClientRect();
    const padding = 8;
    const arrowSize = 6;
    const gap = 6;

    let targetTop = 0;
    let targetLeft = 0;
    let actualPos = position;

    // Check vertical positioning
    if (position === 'top') {
      if (triggerRect.top - tooltipRect.height - gap < padding) {
        actualPos = 'bottom';
        targetTop = triggerRect.bottom + gap;
      } else {
        targetTop = triggerRect.top - tooltipRect.height - gap;
      }
      targetLeft = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    } else if (position === 'bottom') {
      if (triggerRect.bottom + tooltipRect.height + gap > window.innerHeight - padding) {
        actualPos = 'top';
        targetTop = triggerRect.top - tooltipRect.height - gap;
      } else {
        targetTop = triggerRect.bottom + gap;
      }
      targetLeft = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2;
    } else if (position === 'left') {
      if (triggerRect.left - tooltipRect.width - gap < padding) {
        actualPos = 'right';
        targetLeft = triggerRect.right + gap;
      } else {
        targetLeft = triggerRect.left - tooltipRect.width - gap;
      }
      targetTop = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
    } else if (position === 'right') {
      if (triggerRect.right + tooltipRect.width + gap > window.innerWidth - padding) {
        actualPos = 'left';
        targetLeft = triggerRect.left - tooltipRect.width - gap;
      } else {
        targetLeft = triggerRect.right + gap;
      }
      targetTop = triggerRect.top + triggerRect.height / 2 - tooltipRect.height / 2;
    }

    // Clamp horizontal bounds
    const clampedLeft = Math.max(
      padding,
      Math.min(targetLeft, window.innerWidth - tooltipRect.width - padding)
    );

    // Clamp vertical bounds
    const clampedTop = Math.max(
      padding,
      Math.min(targetTop, window.innerHeight - tooltipRect.height - padding)
    );

    // Compute relative arrow position
    let arrowLeft: number | undefined;
    let arrowTop: number | undefined;

    if (actualPos === 'top' || actualPos === 'bottom') {
      const triggerCenterX = triggerRect.left + triggerRect.width / 2;
      arrowLeft = Math.max(
        arrowSize + 4,
        Math.min(triggerCenterX - clampedLeft, tooltipRect.width - arrowSize - 4)
      );
    } else {
      const triggerCenterY = triggerRect.top + triggerRect.height / 2;
      arrowTop = Math.max(
        arrowSize + 4,
        Math.min(triggerCenterY - clampedTop, tooltipRect.height - arrowSize - 4)
      );
    }

    setCoords({
      top: clampedTop,
      left: clampedLeft,
      actualPosition: actualPos,
      arrowLeft,
      arrowTop,
    });
  }, [position]);

  useLayoutEffect(() => {
    if (isVisible) {
      updatePosition();
    }
  }, [isVisible, updatePosition]);

  useEffect(() => {
    if (!isVisible) return;

    const handleScrollOrResize = () => {
      updatePosition();
    };

    window.addEventListener('scroll', handleScrollOrResize, true);
    window.addEventListener('resize', handleScrollOrResize);

    return () => {
      window.removeEventListener('scroll', handleScrollOrResize, true);
      window.removeEventListener('resize', handleScrollOrResize);
    };
  }, [isVisible, updatePosition]);

  if (!content) {
    return <>{children}</>;
  }

  const getArrowClasses = () => {
    switch (coords.actualPosition) {
      case 'bottom':
        return '-top-1 border-t-0 border-r border-b-0 border-l border-[#1C3945] bg-[#0A1D26] rotate-45';
      case 'left':
        return '-right-1 border-t border-r border-b-0 border-l-0 border-[#1C3945] bg-[#0A1D26] rotate-45';
      case 'right':
        return '-left-1 border-t-0 border-r-0 border-b border-l border-[#1C3945] bg-[#0A1D26] rotate-45';
      case 'top':
      default:
        return '-bottom-1 border-t-0 border-r border-b border-l-0 border-[#1C3945] bg-[#0A1D26] rotate-45';
    }
  };

  return (
    <div
      ref={triggerRef}
      className={`relative inline-flex ${className}`}
      onMouseEnter={() => setIsVisible(true)}
      onMouseLeave={() => setIsVisible(false)}
      onFocus={() => setIsVisible(true)}
      onBlur={() => setIsVisible(false)}
    >
      {children}

      {typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={tooltipRef}
            role="tooltip"
            style={{
              position: 'fixed',
              top: `${coords.top}px`,
              left: `${coords.left}px`,
            }}
            className={`z-[9999] pointer-events-none transition-opacity duration-150 ease-out ${
              isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'
            } flex flex-col items-center`}
          >
            <div className="bg-[#0A1D26]/95 backdrop-blur-md text-[#F2F0E8] text-[10px] font-mono font-medium py-1 px-2.5 rounded-md border border-[#1C3945] shadow-xl shadow-black/80 whitespace-nowrap tracking-wide flex items-center gap-1.5 border-[#D9B96E]/50 leading-tight">
              {content}
            </div>
            <div
              className={`absolute w-2 h-2 ${getArrowClasses()}`}
              style={{
                left: coords.arrowLeft !== undefined ? `${coords.arrowLeft}px` : undefined,
                top: coords.arrowTop !== undefined ? `${coords.arrowTop}px` : undefined,
                transform: coords.arrowLeft !== undefined ? 'translateX(-50%) rotate(45deg)' : 'translateY(-50%) rotate(45deg)',
              }}
            />
          </div>,
          document.body
        )}
    </div>
  );
};
