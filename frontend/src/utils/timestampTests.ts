import { normalizeTimestamp, formatDate, formatRelativeTime, formatTimeLeft } from './formatUtils';

/**
 * Tests timestamp conversions to verify our utilities are working correctly
 * For development and debugging purposes
 */
export const testTimestampConversions = () => {
  console.group('Timestamp Conversion Tests');
  
  // Test timestamp provided by the user
  const sampleTimestamp = 1746489600000; // Tuesday, May 6, 2025 12:00:00 AM GMT
  
  console.log('Sample timestamp:', sampleTimestamp);
  console.log('Normalized timestamp:', normalizeTimestamp(sampleTimestamp));
  console.log('As human date:', formatDate(sampleTimestamp));
  console.log('As relative time:', formatRelativeTime(sampleTimestamp));
  console.log('As time left:', formatTimeLeft(sampleTimestamp));
  
  // Test timestamp in seconds (should convert to milliseconds)
  const timestampInSeconds = 1746489600; // Same date but in seconds
  
  console.log('\nTimestamp in seconds:', timestampInSeconds);
  console.log('Normalized timestamp:', normalizeTimestamp(timestampInSeconds));
  console.log('As human date:', formatDate(timestampInSeconds));
  console.log('As relative time:', formatRelativeTime(timestampInSeconds));
  console.log('As time left:', formatTimeLeft(timestampInSeconds));
  
  // Test current timestamp
  const currentTimestamp = Date.now();
  
  console.log('\nCurrent timestamp:', currentTimestamp);
  console.log('Normalized timestamp:', normalizeTimestamp(currentTimestamp));
  console.log('As human date:', formatDate(currentTimestamp));
  console.log('As relative time:', formatRelativeTime(currentTimestamp));
  
  // Test past timestamp
  const pastTimestamp = currentTimestamp - 24 * 60 * 60 * 1000; // 1 day ago
  
  console.log('\nPast timestamp (1 day ago):', pastTimestamp);
  console.log('Normalized timestamp:', normalizeTimestamp(pastTimestamp));
  console.log('As human date:', formatDate(pastTimestamp));
  console.log('As relative time:', formatRelativeTime(pastTimestamp));
  
  // Test extreme future timestamp (year 2050)
  const futureTimestamp = 2524608000000; // January 1, 2050
  
  console.log('\nFuture timestamp (2050):', futureTimestamp);
  console.log('Normalized timestamp:', normalizeTimestamp(futureTimestamp));
  console.log('As human date:', formatDate(futureTimestamp));
  console.log('As relative time:', formatRelativeTime(futureTimestamp));
  console.log('As time left:', formatTimeLeft(futureTimestamp));
  
  console.groupEnd();
};

export const batchConvertTimestamps = (timestamps: number[]) => {
  return timestamps.map(timestamp => {
    const normalized = normalizeTimestamp(timestamp);
    return {
      original: timestamp,
      normalized,
      date: normalized ? formatDate(normalized) : 'Invalid date',
      relative: normalized ? formatRelativeTime(normalized) : 'Invalid date',
      timeLeft: normalized ? formatTimeLeft(normalized) : 'Invalid date'
    };
  });
}; 