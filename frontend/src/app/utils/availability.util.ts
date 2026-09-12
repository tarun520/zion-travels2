import { Car } from '../models/car.model';

function normalizePeriods(car: Car) {
  return Array.isArray(car.unavailablePeriods) ? car.unavailablePeriods : [];
}

function parseInstant(value: string): Date | null {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function rangesOverlap(startA: Date, endA: Date, startB: Date, endB: Date): boolean {
  return startA < endB && startB < endA;
}

function bookingRangeToInstants(startDate: string, endDate: string) {
  const start = parseInstant(`${startDate}T00:00:00`);
  const end = parseInstant(`${endDate}T00:00:00`);
  if (!start || !end) {
    return null;
  }
  return { start, end };
}

function hasUnavailableOverlap(car: Car, rangeStart: Date, rangeEnd: Date): boolean {
  return normalizePeriods(car).some((period) => {
    const periodStart = parseInstant(period.startAt);
    const periodEnd = parseInstant(period.endAt);
    if (!periodStart || !periodEnd) {
      return false;
    }
    return rangesOverlap(rangeStart, rangeEnd, periodStart, periodEnd);
  });
}

export function getCarAvailability(
  car: Car | null,
  startDate?: string | null,
  endDate?: string | null
): { available: boolean; reason?: string } {
  if (!car?.available) {
    return { available: false, reason: 'disabled_by_admin' };
  }

  if (startDate && endDate) {
    const range = bookingRangeToInstants(startDate, endDate);
    if (!range) {
      return { available: false, reason: 'invalid_dates' };
    }
    if (hasUnavailableOverlap(car, range.start, range.end)) {
      return { available: false, reason: 'blocked_period' };
    }
    return { available: true };
  }

  const now = new Date();
  if (hasUnavailableOverlap(car, now, new Date(now.getTime() + 1))) {
    return { available: false, reason: 'blocked_period' };
  }

  return { available: true };
}

export function isCurrentlyBlocked(car: Car): boolean {
  return Boolean(car.available) && getCarAvailability(car).reason === 'blocked_period';
}

export function formatPeriodRange(startAt: string, endAt: string): string {
  const start = new Date(startAt);
  const end = new Date(endAt);
  return `${start.toLocaleString()} → ${end.toLocaleString()}`;
}

export function toDatetimeLocalValue(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function fromDatetimeLocalValue(value: string): string {
  return new Date(value).toISOString();
}
