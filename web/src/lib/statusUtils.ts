import type { BookingStatusValue } from './dispatch';

export function getStatusColor(status: BookingStatusValue): string {
  const colorMap: Record<BookingStatusValue, string> = {
    NEEDS_ASSIGNMENT: 'bg-amber-500 text-zinc-950 dark:bg-amber-400 dark:text-zinc-950',
    ASSIGNED: 'bg-violet-500 text-white dark:bg-violet-600 dark:text-white',
    ACTIVE: 'bg-yellow-500 text-white dark:bg-yellow-600 dark:text-white',
    COMPLETE: 'bg-green-500 text-white dark:bg-green-600 dark:text-white',
    CANCELLED: 'bg-red-500 text-white dark:bg-red-600 dark:text-white',
  };
  
  return colorMap[status] || 'bg-zinc-100 text-zinc-800 dark:bg-zinc-800 dark:text-zinc-200';
}

export function getStatusBadgeVariant(status: BookingStatusValue): string {
  const variantMap: Record<BookingStatusValue, string> = {
    NEEDS_ASSIGNMENT: 'orange',
    ASSIGNED: 'purple',
    ACTIVE: 'yellow', 
    COMPLETE: 'green',
    CANCELLED: 'red',
  };
  
  return variantMap[status] || 'gray';
}
