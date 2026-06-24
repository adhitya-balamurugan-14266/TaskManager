import { cn } from '@/lib/utils';

interface BadgeProps {
  variant?: 'active' | 'completed' | 'overdue' | 'pipeline' | 'dropped' | 'priority' | 'neutral';
  children: React.ReactNode;
  className?: string;
}

import React from 'react';

export function Badge({ variant = 'neutral', children, className }: BadgeProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium',
        {
          'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400': variant === 'active',
          'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400': variant === 'completed',
          'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400': variant === 'overdue',
          'bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-400': variant === 'pipeline',
          'bg-gray-200 text-gray-600 dark:bg-gray-700 dark:text-gray-300': variant === 'dropped',
          'bg-red-600 text-white': variant === 'priority',
          'bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400': variant === 'neutral',
        },
        className
      )}
    >
      {children}
    </span>
  );
}
