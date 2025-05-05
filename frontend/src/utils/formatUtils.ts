export const formatTimeRemaining = (expiration: number): string => {
  // Add more details to the error message
  if (typeof expiration !== 'number') {
    console.error('Invalid expiration value (not a number):', expiration, typeof expiration, new Error().stack);
    return 'Check deadline';
  }
  
  if (isNaN(expiration)) {
    console.error('Invalid expiration value (NaN):', expiration, new Error().stack);
    return 'Check deadline';
  }

  // Ensure we have a valid timestamp in milliseconds
  const adjustedTimestamp = normalizeTimestamp(expiration);
  
  if (adjustedTimestamp === null) {
    // If normalization fails, try a direct approach for browser compat
    try {
      // Simple fallback: If it's likely in seconds, convert to milliseconds
      if (expiration < 10000000000) { // Less than 10 billion (likely seconds)
        const fallbackTimestamp = expiration * 1000;
        const expirationDate = new Date(fallbackTimestamp);
        const now = new Date();
        
        // If this results in a reasonable date, use it
        if (expirationDate > new Date(2000, 0, 1) && expirationDate < new Date(2100, 0, 1)) {
          console.warn('Using fallback timestamp conversion for:', expiration, '→', fallbackTimestamp);
          
          const diff = expirationDate.getTime() - now.getTime();
          if (diff <= 0) return 'Expired';
          
          const days = Math.floor(diff / (1000 * 60 * 60 * 24));
          if (days > 0) return `${days}d remaining`;
          
          const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          if (hours > 0) return `${hours}h remaining`;
          
          const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
          return `${minutes}m remaining`;
        }
      }
    } catch (e) {
      console.error('Fallback conversion failed:', e);
    }
    
    console.error('Could not normalize timestamp:', expiration);
    return 'Check deadline';
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
    return 'Date unavailable';
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
    console.error('Invalid timestamp (NaN):', timestamp, new Error().stack);
    return null;
  }
  
  if (timestamp <= 0) {
    console.error('Invalid timestamp (negative or zero):', timestamp, new Error().stack);
    return null;
  }

  // Hard cap dates beyond reasonable range
  const maxDate = new Date(2100, 0, 1).getTime(); // Upper bound: Year 2100
  const minDate = new Date(2020, 0, 1).getTime(); // Lower bound: Year 2020
  
  let adjustedTimestamp = timestamp;
  const currentTime = Date.now();
  
  // Detect timestamp format and convert to milliseconds
  // Unix timestamps are typically in seconds (10 digits for 2001-2033)
  // JavaScript timestamps are in milliseconds (13 digits for current era)
  if (timestamp < 10000000000) { // Less than 10 billion (likely seconds)
    console.warn('Converting timestamp from seconds to milliseconds:', timestamp);
    adjustedTimestamp = timestamp * 1000;
  }
  
  // Validate the timestamp is within reasonable range
  if (adjustedTimestamp > maxDate || adjustedTimestamp < minDate) {
    console.error('Timestamp outside reasonable range:', {
      original: timestamp,
      adjusted: adjustedTimestamp,
      currentTime,
      minDate,
      maxDate
    });
    
    // If close to min/max date, cap it rather than returning null
    if (adjustedTimestamp > maxDate) adjustedTimestamp = maxDate;
    if (adjustedTimestamp < minDate) adjustedTimestamp = minDate;
  }
  
  // Log the conversion result
  try {
    // Create a date object and check if it's valid
    const testDate = new Date(adjustedTimestamp);
    if (isNaN(testDate.getTime())) {
      console.error('Invalid date created from timestamp:', adjustedTimestamp);
      return null;
    }
    
    // Only try toISOString if we have a valid date
    const dateStr = testDate.toISOString();
    console.debug('Timestamp processed:', {
      original: timestamp,
      adjusted: adjustedTimestamp,
      dateStr
    });
    
    return adjustedTimestamp;
  } catch (error) {
    console.error('Error processing timestamp:', error);
    return null;
  }
};

/**
 * Batch convert unix timestamps to human-readable dates
 * @param timestamps Array of timestamps to convert
 * @returns Array of formatted date strings
 */
export const batchConvertTimestamps = (timestamps: number[]): string[] => {
  return timestamps.map(timestamp => {
    const normalizedTimestamp = normalizeTimestamp(timestamp);
    if (normalizedTimestamp === null) return 'Invalid date';
    return new Date(normalizedTimestamp).toLocaleString();
  });
};

/**
 * Convert a date to unix timestamp in milliseconds
 * @param date Date to convert
 * @returns Unix timestamp in milliseconds
 */
export const dateToTimestamp = (date: Date): number => {
  return date.getTime();
};

/**
 * Validates if a timestamp is reasonable (not too far in the future or past)
 * @param timestamp The timestamp to validate
 * @returns True if the timestamp is valid and reasonable
 */
export const isValidTimestamp = (timestamp: number): boolean => {
  return normalizeTimestamp(timestamp) !== null;
};

/**
 * Format a timestamp as relative time (e.g., "in 13 hours", "3 days ago")
 * @param timestamp Timestamp in milliseconds
 * @returns Formatted relative time string
 */
export const formatRelativeTime = (timestamp: number): string => {
  const normalizedTimestamp = normalizeTimestamp(timestamp);
  if (normalizedTimestamp === null) return 'Date unavailable';
  
  const now = Date.now();
  const diff = normalizedTimestamp - now;
  
  // Convert to absolute difference for calculations
  const absDiff = Math.abs(diff);
  
  // Define time units in milliseconds
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  const week = 7 * day;
  const month = 30 * day;
  const year = 365 * day;
  
  // Format based on the time difference
  if (absDiff < minute) {
    const seconds = Math.round(absDiff / 1000);
    return diff >= 0 ? `in ${seconds} seconds` : `${seconds} seconds ago`;
  } else if (absDiff < hour) {
    const minutes = Math.round(absDiff / minute);
    return diff >= 0 ? `in ${minutes} minute${minutes !== 1 ? 's' : ''}` : `${minutes} minute${minutes !== 1 ? 's' : ''} ago`;
  } else if (absDiff < day) {
    const hours = Math.round(absDiff / hour);
    return diff >= 0 ? `in ${hours} hour${hours !== 1 ? 's' : ''}` : `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  } else if (absDiff < week) {
    const days = Math.round(absDiff / day);
    return diff >= 0 ? `in ${days} day${days !== 1 ? 's' : ''}` : `${days} day${days !== 1 ? 's' : ''} ago`;
  } else if (absDiff < month) {
    const weeks = Math.round(absDiff / week);
    return diff >= 0 ? `in ${weeks} week${weeks !== 1 ? 's' : ''}` : `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
  } else if (absDiff < year) {
    const months = Math.round(absDiff / month);
    return diff >= 0 ? `in ${months} month${months !== 1 ? 's' : ''}` : `${months} month${months !== 1 ? 's' : ''} ago`;
  } else {
    const years = Math.round(absDiff / year);
    return diff >= 0 ? `in ${years} year${years !== 1 ? 's' : ''}` : `${years} year${years !== 1 ? 's' : ''} ago`;
  }
};

/**
 * Format time remaining until a future timestamp (specifically for ballot expiration)
 * @param timestampMs Future timestamp in milliseconds
 * @returns Formatted string showing time left or "Expired"
 */
export const formatTimeLeft = (timestampMs: number): string => {
  // Validate input
  if (typeof timestampMs !== 'number') {
    console.error('formatTimeLeft received non-number value:', timestampMs, typeof timestampMs);
    return 'Check deadline';
  }
  
  if (isNaN(timestampMs)) {
    console.error('formatTimeLeft received NaN value');
    return 'Check deadline';
  }
  
  // Ensure timestamp is reasonable
  if (timestampMs <= 0) {
    console.error('formatTimeLeft received negative or zero value:', timestampMs);
    return 'Check deadline';
  }
  
  // Attempt to normalize the timestamp
  const normalizedTimestamp = normalizeTimestamp(timestampMs);
  if (normalizedTimestamp === null) {
    console.error('Failed to normalize timestamp in formatTimeLeft:', timestampMs);
    
    // Try a simple fallback
    try {
      const date = new Date(timestampMs);
      if (!isNaN(date.getTime())) {
        // Use direct calculation if date is valid
        const now = Date.now();
        const diff = date.getTime() - now;
        
        if (diff <= 0) return "Expired";
        
        const minute = 60 * 1000;
        const hour = 60 * minute;
        const day = 24 * hour;
        
        if (diff < hour) {
          const minutes = Math.ceil(diff / minute);
          return `${minutes} min${minutes !== 1 ? 's' : ''} left`;
        } else if (diff < day) {
          const hours = Math.floor(diff / hour);
          const minutes = Math.ceil((diff % hour) / minute);
          return `${hours}h ${minutes}m left`;
        } else {
          const days = Math.floor(diff / day);
          const hours = Math.ceil((diff % day) / hour);
          return `${days}d ${hours}h left`;
        }
      }
    } catch (e) {
      console.error('Fallback date calculation failed:', e);
    }
    
    return 'Check deadline';
  }
  
  const now = Date.now();
  const diff = normalizedTimestamp - now;
  
  if (diff <= 0) return "Expired";
  
  // Define time units in milliseconds
  const minute = 60 * 1000;
  const hour = 60 * minute;
  const day = 24 * hour;
  
  // Format based on the time difference
  if (diff < hour) {
    const minutes = Math.ceil(diff / minute);
    return `${minutes} min${minutes !== 1 ? 's' : ''} left`;
  } else if (diff < day) {
    const hours = Math.floor(diff / hour);
    const minutes = Math.ceil((diff % hour) / minute);
    return `${hours}h ${minutes}m left`;
  } else {
    const days = Math.floor(diff / day);
    const hours = Math.ceil((diff % day) / hour);
    return `${days}d ${hours}h left`;
  }
};