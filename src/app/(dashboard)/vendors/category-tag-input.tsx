'use client';

import { useState, useRef } from 'react';
import { Input } from '@/components/ui/input';
import { X } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CategoryTagInputProps {
  value: string[];
  onChange: (categories: string[]) => void;
  suggestions: string[];
  error?: string;
}

export function CategoryTagInput({ value, onChange, suggestions, error }: CategoryTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const filteredSuggestions = suggestions.filter(
    (s) => s.toLowerCase().includes(inputValue.toLowerCase()) && !value.includes(s)
  );

  function addCategory(cat: string) {
    const trimmed = cat.trim();
    if (!trimmed || value.includes(trimmed)) return;
    onChange([...value, trimmed]);
    setInputValue('');
    setShowSuggestions(false);
    inputRef.current?.focus();
  }

  function removeCategory(cat: string) {
    onChange(value.filter((c) => c !== cat));
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if ((e.key === 'Enter' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      addCategory(inputValue);
    }
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeCategory(value[value.length - 1]);
    }
    if (e.key === 'Escape') setShowSuggestions(false);
  }

  return (
    <div className="space-y-2">
      {/* Tag chips */}
      {value.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {value.map((cat) => (
            <span
              key={cat}
              className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
            >
              {cat}
              <button
                type="button"
                onClick={() => removeCategory(cat)}
                className="ml-0.5 rounded-full hover:text-destructive focus:outline-none"
                aria-label={`Remove ${cat}`}
              >
                <X className="h-3 w-3" />
              </button>
            </span>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="relative">
        <Input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => { setInputValue(e.target.value); setShowSuggestions(true); }}
          onKeyDown={handleKeyDown}
          onFocus={() => setShowSuggestions(true)}
          onBlur={() => setTimeout(() => setShowSuggestions(false), 150)}
          placeholder={value.length === 0 ? 'Type a category and press Enter…' : 'Add another…'}
          className={cn(error && 'border-destructive')}
        />
        {showSuggestions && filteredSuggestions.length > 0 && (
          <ul className="absolute z-50 mt-1 w-full rounded-xl border border-border bg-card shadow-lg overflow-hidden">
            {filteredSuggestions.map((s) => (
              <li key={s}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-muted transition-colors"
                  onMouseDown={(e) => { e.preventDefault(); addCategory(s); }}
                >
                  {s}
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">Press Enter or comma to add. Backspace removes the last tag.</p>
    </div>
  );
}
