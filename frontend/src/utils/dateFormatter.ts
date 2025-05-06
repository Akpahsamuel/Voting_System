import { format, formatDistanceToNow, formatDistance } from 'date-fns';

/**
 * Format a date or timestamp to a readable string
 * @param date Date object or timestamp in milliseconds
 * @param formatStr Format string (default: 'MMM dd, yyyy')
 */
export function formatDate(date: Date | number, formatStr = 'MMM dd, yyyy'): string {
  if (!date) return 'N/A';
  return format(new Date(date), formatStr);
}

/**
 * Format a date relative to now (e.g. "2 days ago")
 * @param date Date object or timestamp in milliseconds
 */
export function formatRelativeTime(date: Date | number): string {
  if (!date) return 'N/A';
  return formatDistanceToNow(new Date(date), { addSuffix: true });
}

/**
 * Format a time duration between two dates
 * @param start Start date
 * @param end End date
 */
export function formatDuration(start: Date | number, end: Date | number): string {
  if (!start || !end) return 'N/A';
  return formatDistance(new Date(start), new Date(end));
}

/**
 * Format the time left until a date
 * @param date Date object or timestamp in milliseconds
 */
export function formatTimeLeft(date: Date | number): string {
  if (!date) return 'Expired';
  
  const now = new Date();
  const endDate = new Date(date);
  
  if (now > endDate) return 'Expired';
  
  return formatDistance(now, endDate, { addSuffix: false });
}

/**
 * Format time remaining in a more structured format (days, hours, minutes)
 * @param timestamp Unix timestamp or date object
 */
export function formatTimeRemaining(timestamp: number | Date): string {
  if (!timestamp) return 'Expired';
  
  const targetDate = typeof timestamp === 'number' ? new Date(timestamp) : timestamp;
  const now = new Date();
  
  // If the date is in the past, return expired
  if (now > targetDate) return 'Expired';
  
  const diff = targetDate.getTime() - now.getTime();
  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  
  if (days > 0) {
    return `${days}d ${hours}h`;
  } else if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
} 