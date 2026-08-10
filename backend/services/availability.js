const path = require('path');
const fs = require('fs');

const bookingsPath = path.join(__dirname, '..', 'data', 'bookings.json');
const HOLD_MS = 30 * 60 * 1000; // pending checkout hold

function readBookings() {
  try {
    return JSON.parse(fs.readFileSync(bookingsPath, 'utf8'));
  } catch {
    return [];
  }
}

function toDay(value) {
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) {
    return null;
  }
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

/** Half-open range [start, end): return date frees the car that day. */
function rangesOverlap(startA, endA, startB, endB) {
  const aStart = toDay(startA);
  const aEnd = toDay(endA);
  const bStart = toDay(startB);
  const bEnd = toDay(endB);
  if (!aStart || !aEnd || !bStart || !bEnd) {
    return false;
  }
  return aStart < bEnd && bStart < aEnd;
}

function isActiveBooking(booking) {
  if (booking.status === 'paid') {
    return true;
  }
  if (booking.status === 'created') {
    const created = new Date(booking.createdAt).getTime();
    return Number.isFinite(created) && Date.now() - created < HOLD_MS;
  }
  return false;
}

function countOverlappingBookings(carId, startDate, endDate, excludeBookingId = null) {
  return readBookings().filter((booking) => {
    if (booking.carId !== carId) {
      return false;
    }
    if (excludeBookingId && booking.id === excludeBookingId) {
      return false;
    }
    if (!isActiveBooking(booking)) {
      return false;
    }
    return rangesOverlap(booking.startDate, booking.endDate, startDate, endDate);
  }).length;
}

function getCarQuantity(car) {
  const qty = Number(car?.quantity);
  if (!Number.isFinite(qty) || qty < 1) {
    return 1;
  }
  return Math.floor(qty);
}

function getAvailability(car, startDate, endDate, excludeBookingId = null) {
  const quantity = getCarQuantity(car);
  const booked = countOverlappingBookings(car.id, startDate, endDate, excludeBookingId);
  const remaining = Math.max(quantity - booked, 0);
  return {
    quantity,
    booked,
    remaining,
    available: Boolean(car.available) && remaining > 0,
  };
}

module.exports = {
  rangesOverlap,
  countOverlappingBookings,
  getCarQuantity,
  getAvailability,
  HOLD_MS,
};
