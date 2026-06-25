import { useState, useRef, useEffect } from 'react';
import { cn } from '@/utils/cn';

interface GuideTooltipProps {
  content: string;
  className?: string;
  position?: 'top' | 'bottom' | 'left' | 'right';
}

export function GuideTooltip({ content, className, position = 'top' }: GuideTooltipProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen]);

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  }[position];

  return (
    <div ref={containerRef} className={cn('relative inline-block z-30', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="relative flex h-[18px] w-[18px] items-center justify-center rounded-full bg-indigo-50 text-indigo-600 border border-indigo-100 hover:bg-indigo-600 hover:text-white transition-all duration-300 shadow-sm outline-none cursor-pointer focus:ring-2 focus:ring-indigo-300"
        aria-label="Rehber bilgi"
      >
        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-indigo-400 opacity-60"></span>
        <span className="relative text-[10px] font-black">?</span>
      </button>

      {isOpen && (
        <div
          className={cn(
            'absolute w-52 rounded-xl border border-indigo-100 bg-white p-3 shadow-xl ring-1 ring-indigo-900/5 animate-in fade-in zoom-in-95 duration-200 text-left',
            positionClasses
          )}
        >
          {/* Arrow */}
          <div className={cn(
            'absolute h-2 w-2 rotate-45 border-slate-200 bg-white',
            position === 'top' && 'bottom-[-5px] left-1/2 -translate-x-1/2 border-r border-b border-indigo-100',
            position === 'bottom' && 'top-[-5px] left-1/2 -translate-x-1/2 border-l border-t border-indigo-100',
            position === 'left' && 'right-[-5px] top-1/2 -translate-y-1/2 border-r border-t border-indigo-100',
            position === 'right' && 'left-[-5px] top-1/2 -translate-y-1/2 border-l border-b border-indigo-100',
          )} />
          
          <p className="text-xs font-semibold text-slate-600 leading-relaxed relative z-10">{content}</p>
        </div>
      )}
    </div>
  );
}
