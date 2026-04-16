'use client';

import { cn } from '@/lib/utils';

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label: string;
  error?: string;
  fullWidth?: boolean;
}

export function Input({ label, error, fullWidth = false, className, ...props }: InputProps) {
  return (
    <div className={cn('flex flex-col gap-1.5', fullWidth && 'w-full', className)}>
      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </label>
      <input
        className={cn(
          'w-full min-w-0 rounded-lg border px-3 py-2.5 text-base transition-colors',
          'bg-white dark:bg-zinc-800',
          'border-zinc-300 dark:border-zinc-700',
          'focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-red-500 focus:ring-red-500',
          'dark:text-white'
        )}
        aria-invalid={!!error}
        aria-describedby={error ? `${props.id || label.toLowerCase()}-error` : undefined}
        {...props}
      />
      {error && (
        <span id={`${props.id || label.toLowerCase()}-error`} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </span>
      )}
    </div>
  );
}
