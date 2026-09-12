function normalizePeriods(car) {
  return Array.isArray(car?.unavailablePeriods) ? car.unavailablePeriods : [];
}

function parseInstant(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function rangesOverlap(startA, endA, startB, endB) {
  return startA < endB && startB < endA;
}

function bookingRangeToInstants(startDate, endDate) {
  const start = parseInstant(`${startDate}T00:00:00`);
  const end = parseInstant(`${endDate}T00:00:00`);
  if (!start || !end) {
    return null;
  }
  return { start, end };
}

function hasUnavailableOverlap(car, rangeStart, rangeEnd) {
  return normalizePeriods(car).some((period) => {
    const periodStart = parseInstant(period.startAt);
    const periodEnd = parseInstant(period.endAt);
    if (!periodStart || !periodEnd) {
      return false;
    }
    return rangesOverlap(rangeStart, rangeEnd, periodStart, periodEnd);
  });
}

function getAvailability(car, startDate = null, endDate = null) {
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
  const probeEnd = new Date(now.getTime() + 1);
  if (hasUnavailableOverlap(car, now, probeEnd)) {
    return { available: false, reason: 'blocked_period' };
  }

  return { available: true };
}

function isCurrentlyBlocked(car) {
  return getAvailability(car).available === false && car?.available === true;
}

module.exports = {
  getAvailability,
  hasUnavailableOverlap,
  isCurrentlyBlocked,
  normalizePeriods,
};
