import React, { useLayoutEffect, useRef } from 'react';

export interface AutoGrowTextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  minHeight?: number;
  wrapperClassName?: string;
  wrapperStyle?: React.CSSProperties;
}

export const AutoGrowTextarea = React.forwardRef<
  HTMLTextAreaElement,
  AutoGrowTextareaProps
>(
  (
    {
      minHeight = 52,
      wrapperClassName = '',
      wrapperStyle,
      value,
      className,
      style,
      ...props
    },
    ref
  ) => {
    const innerRef = useRef<HTMLTextAreaElement | null>(null);
    const wrapperRef = useRef<HTMLDivElement | null>(null);

    // Merge forwarded ref and innerRef
    const setRef = (node: HTMLTextAreaElement | null) => {
      innerRef.current = node;
      if (typeof ref === 'function') {
        ref(node);
      } else if (ref) {
        (ref as React.MutableRefObject<HTMLTextAreaElement | null>).current = node;
      }
    };

    useLayoutEffect(() => {
      const textarea = innerRef.current;
      const wrapper = wrapperRef.current;
      if (!textarea) return;

      const scrollY = typeof window !== 'undefined' ? window.scrollY : 0;
      const currentHeight = textarea.offsetHeight;

      // 1. Lock wrapper min-height to textarea's current height before resetting
      if (wrapper && currentHeight > 0) {
        wrapper.style.minHeight = `${currentHeight}px`;
      }

      // 2. Set height to auto to measure scrollHeight
      textarea.style.height = 'auto';

      // 3. Apply target height with minimum height
      const targetHeight = Math.max(minHeight, textarea.scrollHeight);
      textarea.style.height = `${targetHeight}px`;

      // 4. Release wrapper lock
      if (wrapper) {
        wrapper.style.minHeight = '';
      }

      // 5. Restore window.scrollY if clamped or altered
      if (typeof window !== 'undefined' && window.scrollY !== scrollY) {
        window.scrollTo(window.scrollX, scrollY);
      }
    }, [value, minHeight]);

    return (
      <div
        ref={wrapperRef}
        className={`w-full relative ${wrapperClassName}`}
        style={wrapperStyle}
      >
        <textarea
          ref={setRef}
          value={value}
          className={className}
          style={style}
          {...props}
        />
      </div>
    );
  }
);

AutoGrowTextarea.displayName = 'AutoGrowTextarea';
export default AutoGrowTextarea;
