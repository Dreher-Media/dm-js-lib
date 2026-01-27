/**
 * Conditional Module - Utility Functions
 * Helper functions for parsing dates, times, and URL parameters
 */

/**
 * Gets the current URL parameters
 * @returns URLSearchParams object
 */
export function getUrlParams(): URLSearchParams {
  return new URLSearchParams(window.location.search);
}

/**
 * Gets the current day of week as lowercase string
 * @returns Day name (monday, tuesday, etc.)
 */
export function getDayOfWeek(): string {
  const days = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday'];
  return days[new Date().getDay()];
}

/**
 * Parses a date string in YYYY-MM-DD format or datetime in YYYY-MM-DD HH:MM or YYYY-MM-DDTHH:MM format
 * @param dateStr - Date or datetime string
 * @returns Date object or null if invalid
 */
export function parseDate(dateStr: string): Date | null {
  // Try parsing as-is first (handles ISO format YYYY-MM-DDTHH:MM)
  let date = new Date(dateStr);
  if (!isNaN(date.getTime())) {
    return date;
  }

  // Try parsing YYYY-MM-DD HH:MM format
  const spaceMatch = dateStr.match(/^(\d{4}-\d{2}-\d{2})\s+(\d{1,2}):(\d{2})$/);
  if (spaceMatch) {
    const [, datePart, hours, minutes] = spaceMatch;
    date = new Date(datePart);
    if (!isNaN(date.getTime())) {
      date.setHours(parseInt(hours, 10), parseInt(minutes, 10), 0, 0);
      return date;
    }
  }

  return null;
}

/**
 * Parses a time string in HH:MM format
 * @param timeStr - Time string
 * @returns Date object with today's date and specified time, or null if invalid
 */
export function parseTime(timeStr: string): Date | null {
  const match = timeStr.match(/^(\d{1,2}):(\d{2})$/);
  if (!match) {
    return null;
  }

  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);

  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return null;
  }

  const now = new Date();
  now.setHours(hours, minutes, 0, 0);
  return now;
}

/**
 * Checks if a date is within a range (inclusive)
 * @param date - Date to check
 * @param start - Start date (optional)
 * @param end - End date (optional)
 * @returns True if date is in range
 */
export function isDateInRange(date: Date, start?: Date, end?: Date): boolean {
  if (start && date < start) {
    return false;
  }
  if (end && date > end) {
    return false;
  }
  return true;
}

/**
 * Checks if a time is within a range (inclusive)
 * @param time - Time to check (Date object)
 * @param start - Start time (Date object, optional)
 * @param end - End time (Date object, optional)
 * @returns True if time is in range
 */
export function isTimeInRange(time: Date, start?: Date, end?: Date): boolean {
  const timeMinutes = time.getHours() * 60 + time.getMinutes();
  
  if (start) {
    const startMinutes = start.getHours() * 60 + start.getMinutes();
    if (timeMinutes < startMinutes) {
      return false;
    }
  }
  
  if (end) {
    const endMinutes = end.getHours() * 60 + end.getMinutes();
    if (timeMinutes > endMinutes) {
      return false;
    }
  }
  
  return true;
}

/**
 * Normalizes a date to midnight for date-only comparisons
 * @param date - Date to normalize
 * @returns Date normalized to midnight
 */
export function normalizeDate(date: Date): Date {
  const normalized = new Date(date);
  normalized.setHours(0, 0, 0, 0);
  return normalized;
}
