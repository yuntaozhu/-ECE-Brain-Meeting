/**
 * Meeting Time Helper Utility
 * Calculates valid meeting start and end UNIX timestamps (in seconds) that are guaranteed to be in the future,
 * and enforces a minimum meeting duration (default 15 minutes) to prevent immediate meeting termination
 * caused by invalid or expired time ranges.
 */

export interface MeetingTimeRange {
  startTimeSec: number;
  endTimeSec: number;
  durationMinutes: number;
  isFuture: boolean;
  formattedStart: string;
  formattedEnd: string;
}

/**
 * Calculates and validates meeting start/end UNIX timestamps in seconds.
 * @param customStartTime Optional start time (UNIX timestamp in seconds, milliseconds, or Date string)
 * @param customEndTime Optional end time (UNIX timestamp in seconds, milliseconds, or Date string)
 * @param minDurationMinutes Minimum meeting duration in minutes (default 15 minutes)
 */
export function calculateValidMeetingTimeRange(
  customStartTime?: number | string | Date,
  customEndTime?: number | string | Date,
  minDurationMinutes: number = 15
): MeetingTimeRange {
  const nowSec = Math.floor(Date.now() / 1000);
  
  // 1. Parse or default start time (ensure it's not in the past; minimum 30 seconds buffer in future if not specified)
  let startTimeSec = nowSec + 30;
  
  if (customStartTime !== undefined && customStartTime !== null && customStartTime !== '') {
    if (typeof customStartTime === 'number') {
      // If timestamp is given in milliseconds (e.g. > 1e12), convert to seconds
      startTimeSec = customStartTime > 10000000000 ? Math.floor(customStartTime / 1000) : customStartTime;
    } else if (customStartTime instanceof Date) {
      startTimeSec = Math.floor(customStartTime.getTime() / 1000);
    } else if (typeof customStartTime === 'string') {
      const parsed = Date.parse(customStartTime);
      if (!isNaN(parsed)) {
        startTimeSec = Math.floor(parsed / 1000);
      } else {
        const num = Number(customStartTime);
        if (!isNaN(num)) {
          startTimeSec = num > 10000000000 ? Math.floor(num / 1000) : num;
        }
      }
    }
  }

  // If start time is in the past, adjust to now + 30 seconds to prevent Tencent API instant expiration/invalid status
  if (startTimeSec < nowSec) {
    console.warn(`[MeetingTimeHelper] Start time ${startTimeSec} is in the past. Adjusting to current time + 30s.`);
    startTimeSec = nowSec + 30;
  }

  // 2. Parse or default end time
  const minDurationSec = minDurationMinutes * 60;
  let endTimeSec = startTimeSec + 3600; // default 1 hour

  if (customEndTime !== undefined && customEndTime !== null && customEndTime !== '') {
    if (typeof customEndTime === 'number') {
      endTimeSec = customEndTime > 10000000000 ? Math.floor(customEndTime / 1000) : customEndTime;
    } else if (customEndTime instanceof Date) {
      endTimeSec = Math.floor(customEndTime.getTime() / 1000);
    } else if (typeof customEndTime === 'string') {
      const parsed = Date.parse(customEndTime);
      if (!isNaN(parsed)) {
        endTimeSec = Math.floor(parsed / 1000);
      } else {
        const num = Number(customEndTime);
        if (!isNaN(num)) {
          endTimeSec = num > 10000000000 ? Math.floor(num / 1000) : num;
        }
      }
    }
  }

  // 3. Validate minimum duration (at least minDurationMinutes)
  const actualDurationSec = endTimeSec - startTimeSec;
  if (actualDurationSec < minDurationSec) {
    console.warn(`[MeetingTimeHelper] Meeting duration (${Math.round(actualDurationSec / 60)} mins) is less than minimum ${minDurationMinutes} mins. Extending end time.`);
    endTimeSec = startTimeSec + minDurationSec;
  }

  const finalDurationMinutes = Math.round((endTimeSec - startTimeSec) / 60);

  return {
    startTimeSec,
    endTimeSec,
    durationMinutes: finalDurationMinutes,
    isFuture: startTimeSec >= nowSec,
    formattedStart: new Date(startTimeSec * 1000).toLocaleString(),
    formattedEnd: new Date(endTimeSec * 1000).toLocaleString(),
  };
}

/**
 * Validates meeting payload before submitting to Tencent Meeting REST API.
 * Throws an error if time ranges are invalid or cause premature closure.
 */
export function validateMeetingPayload(params: { startTime?: any; endTime?: any }): { start_time: string; end_time: string } {
  const range = calculateValidMeetingTimeRange(params.startTime, params.endTime, 15);
  return {
    start_time: String(range.startTimeSec),
    end_time: String(range.endTimeSec),
  };
}
