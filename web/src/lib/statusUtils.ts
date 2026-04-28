import type { BookingStatusValue } from './dispatch';

export function getStatusColor(status: BookingStatusValue): string {
  const colorMap: Record<BookingStatusValue, string> = {
    NEW: 'bg-amber-500 text-white dark:bg-amber-600 dark:text-white',
    CONFIRMED: 'bg-blue-500 text-white dark:bg-blue-600 dark:text-white',
    ASSIGNED: 'bg-violet-500 text-white dark:bg-violet-600 dark:text-white',
    ACTIVE: 'bg-yellow-500 text-white dark:bg-yellow-600 dark:text-white',
    COMPLETED: 'bg-green-500 text-white dark:bg-green-600 dark:text-white',
    CANCELLED: 'bg-red-500 text-white dark:bg-red-600 dark:text-white',
  };
  
  return colorMap[status] || 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200';
}

export function getStatusBadgeVariant(status: BookingStatusValue): string {
  const variantMap: Record<BookingStatusValue, string> = {
    NEW: 'orange',
    CONFIRMED: 'blue',
    ASSIGNED: 'purple',
    ACTIVE: 'yellow', 
    COMPLETED: 'green',
    CANCELLED: 'red',
  };
  
  return variantMap[status] || 'gray';
}