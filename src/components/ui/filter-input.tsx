import { cn } from '@/lib/utils';
import * as React from 'react';
import { Input } from './input';

interface FilterInputProps
  extends Omit<React.ComponentProps<'input'>, 'onSelect'> {
  suggestions?: string[];
  onSuggestionSelect?: (value: string) => void;
  label?: string;
}

export function FilterInput({
  className,
  suggestions = [],
  onSuggestionSelect,
  label,
  value,
  onChange,
  ...props
}: FilterInputProps) {
  const [showSuggestions, setShowSuggestions] = React.useState(false);
  const wrapperRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        wrapperRef.current &&
        !wrapperRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={wrapperRef} className="relative w-full">
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      <Input
        value={value}
        onChange={onChange}
        onFocus={() => setShowSuggestions(true)}
        className={cn('w-full', className)}
        {...props}
      />
      {showSuggestions && suggestions.length > 0 && (
        <div className="absolute z-10 w-full mt-1 bg-white shadow-lg max-h-60 rounded-md py-1 text-base overflow-auto focus:outline-none sm:text-sm">
          {(() => {
            // sort suggestions numeric then alphabetical
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
                return -1;
              } else if (numB != null) {
                return 1;
              }
              return String(a)
                .toLowerCase()
                .localeCompare(String(b).toLowerCase());
            };
            return [...suggestions]
              .sort(sortByNumberThenAlpha)
              .map((suggestion, index) => (
                <div
                  key={index}
                  className="cursor-pointer select-none relative py-2 pl-3 pr-9 hover:bg-gray-100"
                  onClick={() => {
                    if (onSuggestionSelect) onSuggestionSelect(suggestion);
                    if (onChange) {
                      // Create a synthetic event to update the input value
                      const syntheticEvent = {
                        target: { value: suggestion },
                      } as React.ChangeEvent<HTMLInputElement>;
                      onChange(syntheticEvent);
                    }
                    setShowSuggestions(false);
                  }}
                >
                  {suggestion}
                </div>
              ));
          })()}
        </div>
      )}
    </div>
  );
}
