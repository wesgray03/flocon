import { cn } from '@/lib/utils';
import * as React from 'react';
import { createPortal } from 'react-dom';
import { Input } from './input';

interface MultiFilterInputProps extends React.ComponentProps<'input'> {
  suggestions?: string[];
  values: string[];
  onChangeValues: (values: string[]) => void;
  label?: string;
}

export function MultiFilterInput({
  className,
  suggestions = [],
  values,
  onChangeValues,
  label,
  ...props
}: MultiFilterInputProps) {
  const [inputValue, setInputValue] = React.useState('');
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  const [portalStyle, setPortalStyle] =
    React.useState<React.CSSProperties | null>(null);
  const portalRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      const target = event.target as Node;
      const clickedInsideWrapper = wrapperRef.current?.contains(target);
      const clickedInsidePortal = portalRef.current?.contains(target);
      if (!clickedInsideWrapper && !clickedInsidePortal) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // compute portal position so the dropdown can be rendered into document.body
  React.useEffect(() => {
    if (!showSuggestions) return;
    const update = () => {
      const el = wrapperRef.current;
      if (!el || typeof document === 'undefined') return;
      const rect = el.getBoundingClientRect();
      setPortalStyle({
        position: 'absolute',
        left: rect.left + window.scrollX,
        top: rect.bottom + window.scrollY,
        width: rect.width,
        zIndex: 10050,
      });
    };
    update();
    window.addEventListener('resize', update);
    window.addEventListener('scroll', update, true);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('scroll', update, true);
    };
  }, [showSuggestions]);

  const filteredSuggestions = suggestions.filter(
    (s) =>
      !values.includes(s) &&
      (!inputValue || s.toLowerCase().includes(inputValue.toLowerCase()))
  );

  // Sort suggestions: numeric prefix (e.g. "1. Phase") ascending first, then alphabetical
  const sortByNumberThenAlpha = (a: string, b: string) => {
    const numA = (() => {
      const m = String(a)
        .trim()
        .match(/^\s*(\d+)\b/);
      return m ? Number(m[1]) : null;
    })();
    const numB = (() => {
      const m = String(b)
        .trim()
        .match(/^\s*(\d+)\b/);
      return m ? Number(m[1]) : null;
    })();
    if (numA != null && numB != null) {
      if (numA !== numB) return numA - numB;
    } else if (numA != null) {
      return -1; // A has number, B doesn't -> A first
    } else if (numB != null) {
      return 1; // B has number, A doesn't -> B first
    }
    return String(a).toLowerCase().localeCompare(String(b).toLowerCase());
  };

  const sortedFilteredSuggestions = [...filteredSuggestions].sort(
    sortByNumberThenAlpha
  );

  const [hoverIndex, setHoverIndex] = React.useState<number | null>(null);

  const addValue = (val: string) => {
    const v = val.trim();
    if (!v) return;
    if (!values.includes(v)) onChangeValues([...values, v]);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (inputValue.trim()) {
        addValue(inputValue);
        setInputValue('');
        setShowSuggestions(false);
      }
    }
    if (e.key === ',') {
      // allow comma to commit
      e.preventDefault();
      if (inputValue.trim()) {
        addValue(inputValue.replace(/,$/, ''));
        setInputValue('');
        setShowSuggestions(false);
      }
    }
  };

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <div className="flex flex-wrap gap-1 mb-1">
        {values.map((val) => (
          <span
            key={val}
            className="inline-flex items-center bg-blue-100 text-blue-800 rounded px-2 py-0.5 text-xs mr-1 mb-1"
          >
            {val}
            <button
              type="button"
              aria-label={`Remove ${val}`}
              className="ml-1 text-blue-600 hover:text-blue-900 focus:outline-none"
              onClick={() => {
                onChangeValues(values.filter((v) => v !== val));
              }}
              tabIndex={-1}
            >
              ×
            </button>
          </span>
        ))}
      </div>
      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={onKeyDown}
        onFocus={() => setShowSuggestions(true)}
        className={cn('w-full', className)}
        placeholder={props.placeholder}
        {...props}
      />
      {showSuggestions &&
        filteredSuggestions.length > 0 &&
        portalStyle &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={portalRef}
            style={{
              background: '#faf8f5',
              boxShadow: '0 10px 25px rgba(0,0,0,0.08)',
              maxHeight: 240,
              overflow: 'auto',
              borderRadius: 8,
              padding: 4,
              ...portalStyle,
            }}
          >
            {sortedFilteredSuggestions.map((suggestion, index) => (
              <div
                key={index}
                style={{
                  padding: '8px 12px',
                  cursor: 'pointer',
                  borderRadius: 4,
                  background: hoverIndex === index ? '#ebe5db' : 'transparent',
                }}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setHoverIndex(index)}
                onMouseLeave={() => setHoverIndex(null)}
                onClick={() => {
                  if (!values.includes(suggestion)) {
                    onChangeValues([...values, suggestion]);
                  }
                  setInputValue('');
                  // keep suggestions open so user can click multiple items
                }}
              >
                {suggestion}
              </div>
            ))}
          </div>,
          document.body
        )}
    </div>
  );
}
