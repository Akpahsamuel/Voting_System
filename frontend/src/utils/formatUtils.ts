export const formatTimeRemaining = (expiration: number): string => {
  // Ensure expiration is a valid number
  if (typeof expiration !== 'number' || isNaN(expiration)) {
    console.error('Invalid expiration value:', expiration);
    return 'Invalid date';
  }

  // Ensure we have a valid timestamp in milliseconds
  const adjustedTimestamp = normalizeTimestamp(expiration);
  
  if (adjustedTimestamp === null) {
    console.error('Could not normalize timestamp:', expiration);
    return 'Invalid date';
  }

  const now = new Date().getTime();
  const diff = adjustedTimestamp - now;

  if (diff <= 0) return 'Expired';

  const days = Math.floor(diff / (1000 * 60 * 60 * 24));
  const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  // Format the time remaining in a more readable way
  if (days > 0) return `${days}d ${hours}h ${minutes}m remaining`;
  if (hours > 0) return `${hours}h ${minutes}m ${seconds}s remaining`;
  if (minutes > 0) return `${minutes}m ${seconds}s remaining`;
  return `${seconds}s remaining`;
};

/**
 * Safely formats a date from a timestamp, handling invalid or extremely large values
 * @param timestamp The timestamp to format (in milliseconds since epoch)
 * @param options Formatting options
 * @returns Formatted date string or 'Invalid date' for problematic timestamps
 */
export const formatDate = (timestamp: number, options?: Intl.DateTimeFormatOptions): string => {
  // Normalize the timestamp to ensure it's in milliseconds
  const adjustedTimestamp = normalizeTimestamp(timestamp);
  
  if (adjustedTimestamp === null) {
    return 'Invalid date';
  }
  
  const defaultOptions: Intl.DateTimeFormatOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  };
  
  return new Date(adjustedTimestamp).toLocaleDateString('en-US', options || defaultOptions);
};

/**
 * Normalizes a timestamp to ensure it's in milliseconds and within a reasonable range
 * @param timestamp The timestamp to normalize
 * @returns Normalized timestamp in milliseconds, or null if invalid
 */
export const normalizeTimestamp = (timestamp: number): number | null => {
  // Check if it's a valid number
  if (isNaN(timestamp)) {
    console.error('Invalid timestamp (NaN):', timestamp);
    return null;
  }
  
  // For blockchain timestamps, just use them directly without conversion
  // The blockchain already provides timestamps in milliseconds
  if (timestamp > 0) {
    return timestamp;
  }
  
  // If timestamp is negative or zero, it's invalid
  console.error('Invalid timestamp (negative or zero):', timestamp);
  return null;
};

/**
 * Validates if a timestamp is reasonable (not too far in the future or past)
 * @param timestamp The timestamp to validate
 * @returns True if the timestamp is valid and reasonable
 */
export const isValidTimestamp = (timestamp: number): boolean => {
  return normalizeTimestamp(timestamp) !== null;
};