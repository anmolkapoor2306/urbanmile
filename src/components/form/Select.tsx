'use client';

import { cn } from '@/lib/utils';

interface SelectOption {
  value: string;
  label: string;
}

interface SelectProps {
  label: string;
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  error?: string;
  fullWidth?: boolean;
  id?: string;
  disabled?: boolean;
}

export function Select({ label, options, value, onChange, error, fullWidth = false, id, disabled }: SelectProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full')}>
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        className={cn(
          'w-full min-w-0 rounded-lg border px-3 py-2.5 text-base transition-colors',
          'text-zinc-900',
          'bg-white dark:bg-zinc-800',
          'border-zinc-300 dark:border-zinc-700',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-red-500 focus:ring-red-500',
          'dark:text-white'
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${id}-error` : undefined}
      >
        <option value="">Select an option</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
      {error && (
        <span id={`${id}-error`} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
