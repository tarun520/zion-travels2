const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Razorpay = require('razorpay');
const { sendBookingReceipt } = require('../services/mail');
const { getAvailability } = require('../services/availability');

const router = express.Router();
const bookingsPath = path.join(__dirname, '..', 'data', 'bookings.json');
const carsPath = path.join(__dirname, '..', 'data', 'cars.json');
const ADVANCE_AMOUNT_INR = Number(process.env.ADVANCE_AMOUNT_INR || 1000);

function readJson(filePath, fallback = []) {
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function writeBookings(bookings) {
  fs.writeFileSync(bookingsPath, JSON.stringify(bookings, null, 2));
}

function getRazorpay() {
  const keyId = process.env.RAZORPAY_KEY_ID;
  const keySecret = process.env.RAZORPAY_KEY_SECRET;
  if (!keyId || !keySecret || keyId.includes('ReplaceWith') || keySecret.includes('ReplaceWith')) {
    return null;
  }
  return new Razorpay({ key_id: keyId, key_secret: keySecret });
}

function daysBetween(startDate, endDate) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) {
    return 0;
  }
  const diff = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
  return Math.max(diff, 1);
}

router.get('/config', (_req, res) => {
  const keyId = process.env.RAZORPAY_KEY_ID || '';
  const configured = Boolean(
    keyId &&
      process.env.RAZORPAY_KEY_SECRET &&
      !keyId.includes('ReplaceWith') &&
      !String(process.env.RAZORPAY_KEY_SECRET).includes('ReplaceWith')
  );
  res.json({
    keyId: configured ? keyId : '',
    configured,
  });
});

router.get('/', (_req, res) => {
  res.json(readJson(bookingsPath));
});

router.get('/availability', (req, res) => {
  try {
    const { carId, startDate, endDate } = req.query;
    if (!carId) {
      return res.status(400).json({ error: 'carId is required' });
    }

    const cars = readJson(carsPath);
    const car = cars.find((c) => c.id === carId);
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }

    const availability = getAvailability(
      car,
      startDate ? String(startDate) : null,
      endDate ? String(endDate) : null
    );

    res.json({
      carId: car.id,
      startDate: startDate || null,
      endDate: endDate || null,
      ...availability,
    });
  } catch (err) {
    console.error('availability failed', err);
    res.status(500).json({ error: 'Failed to check availability' });
  }
});

router.post('/create-order', async (req, res) => {
  try {
    const {
      carId,
      customerName,
      customerEmail,
      customerPhone,
      startDate,
      endDate,
    } = req.body;

    if (!carId || !customerName || !customerEmail || !customerPhone || !startDate || !endDate) {
      return res.status(400).json({ error: 'All booking fields are required' });
    }

    if (new Date(endDate) <= new Date(startDate)) {
      return res.status(400).json({ error: 'End date must be after start date' });
    }

    const cars = readJson(carsPath);
    const car = cars.find((c) => c.id === carId);
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }
    if (!car.available) {
      return res.status(400).json({ error: 'Car is not available for booking' });
    }

    const availability = getAvailability(car, startDate, endDate);
    if (!availability.available) {
      return res.status(409).json({
        error: 'Car is unavailable for the selected dates',
        ...availability,
      });
    }

    const days = daysBetween(startDate, endDate);
    const totalAmountInr = Number(car.price) * days;
    if (!totalAmountInr || totalAmountInr <= 0) {
      return res.status(400).json({ error: 'Invalid booking amount' });
    }

    // Online: fixed advance. Offline: remainder at pickup/return.
    const advanceAmountInr = Math.min(ADVANCE_AMOUNT_INR, totalAmountInr);
    const remainingAmountInr = Math.max(totalAmountInr - advanceAmountInr, 0);
    const amountPaise = Math.round(advanceAmountInr * 100);
    const bookingId = uuidv4();
    const razorpay = getRazorpay();

    let orderId = `demo_order_${bookingId.slice(0, 8)}`;
    let demoMode = false;

    if (!razorpay) {
      demoMode = true;
    } else {
      const order = await razorpay.orders.create({
        amount: amountPaise,
        currency: 'INR',
        receipt: `zion_${bookingId.slice(0, 8)}`,
        notes: {
          bookingId,
          carId: car.id,
          carName: car.name,
          days: String(days),
          totalAmountInr: String(totalAmountInr),
          advanceAmountInr: String(advanceAmountInr),
          remainingAmountInr: String(remainingAmountInr),
        },
      });
      orderId = order.id;
    }

    const booking = {
      id: bookingId,
      carId: car.id,
      carName: car.name,
      carImage: car.image,
      pricePerUnit: car.price,
      priceUnit: car.priceUnit,
      days,
      amountInr: totalAmountInr,
      totalAmountInr,
      advanceAmountInr,
      remainingAmountInr,
      amountPaise,
      currency: 'INR',
      paymentMode: 'advance_online_balance_offline',
      customerName: String(customerName).trim(),
      customerEmail: String(customerEmail).trim(),
      customerPhone: String(customerPhone).trim(),
      startDate,
      endDate,
      razorpayOrderId: orderId,
      razorpayPaymentId: null,
      status: 'created',
      demoMode,
      createdAt: new Date().toISOString(),
    };

    const bookings = readJson(bookingsPath);
    bookings.push(booking);
    writeBookings(bookings);

    res.status(201).json({
      bookingId: booking.id,
      orderId,
      amount: amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID || '',
      demoMode,
      carName: car.name,
      days,
      amountInr: totalAmountInr,
      totalAmountInr,
      advanceAmountInr,
      remainingAmountInr,
    });
  } catch (err) {
    console.error('create-order failed', err);
    res.status(500).json({ error: err?.error?.description || err.message || 'Failed to create order' });
  }
});

function markPaid(booking, updates = {}) {
  Object.assign(booking, updates, {
    status: 'paid',
    paidAt: new Date().toISOString(),
    receiptEmailSent: false,
  });
  return booking;
}

function queueReceiptEmail(bookingId) {
  // Send after response so the client is not blocked on SMTP.
  setImmediate(async () => {
    try {
      const bookings = readJson(bookingsPath);
      const index = bookings.findIndex((b) => b.id === bookingId);
      if (index === -1) {
        return;
      }
      const booking = bookings[index];
      const receipt = await sendBookingReceipt(booking);
      booking.receiptEmailSent = Boolean(receipt.sent);
      booking.receiptEmailSentAt = receipt.sent ? new Date().toISOString() : null;
      if (!receipt.sent && receipt.reason) {
        booking.receiptEmailError = receipt.reason;
      }
      bookings[index] = booking;
      writeBookings(bookings);
    } catch (mailErr) {
      console.error('Receipt email failed', mailErr);
      try {
        const bookings = readJson(bookingsPath);
        const index = bookings.findIndex((b) => b.id === bookingId);
        if (index === -1) {
          return;
        }
        bookings[index].receiptEmailSent = false;
        bookings[index].receiptEmailError = mailErr.message || 'Failed to send receipt';
        writeBookings(bookings);
      } catch {
        /* ignore secondary write errors */
      }
    }
  });
}

router.post('/verify', async (req, res) => {
  try {
    const {
      bookingId,
      razorpay_order_id,
      razorpay_payment_id,
      razorpay_signature,
      demoConfirm,
    } = req.body;

    const bookings = readJson(bookingsPath);
    const index = bookings.findIndex((b) => b.id === bookingId);
    if (index === -1) {
      return res.status(404).json({ error: 'Booking not found' });
    }

    const booking = bookings[index];

    // Re-check inventory before confirming payment (exclude this pending hold).
    const cars = readJson(carsPath);
    const car = cars.find((c) => c.id === booking.carId);
    if (!car || !car.available) {
      booking.status = 'failed';
      bookings[index] = booking;
      writeBookings(bookings);
      return res.status(400).json({ error: 'Car is no longer available' });
    }

    const availability = getAvailability(car, booking.startDate, booking.endDate);
    if (!availability.available) {
      booking.status = 'failed';
      bookings[index] = booking;
      writeBookings(bookings);
      return res.status(409).json({
        error: 'Car is unavailable for the selected dates',
        ...availability,
      });
    }

    if (booking.demoMode || demoConfirm) {
      markPaid(booking, {
        razorpayPaymentId: razorpay_payment_id || `demo_pay_${Date.now()}`,
        razorpayOrderId: razorpay_order_id || booking.razorpayOrderId,
      });
      bookings[index] = booking;
      writeBookings(bookings);
      queueReceiptEmail(booking.id);
      return res.json({
        success: true,
        booking,
        demoMode: true,
        receiptEmailQueued: true,
      });
    }

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      return res.status(400).json({ error: 'Missing payment verification fields' });
    }

    const secret = process.env.RAZORPAY_KEY_SECRET;
    const body = `${razorpay_order_id}|${razorpay_payment_id}`;
    const expected = crypto.createHmac('sha256', secret).update(body).digest('hex');

    if (expected !== razorpay_signature) {
      booking.status = 'failed';
      bookings[index] = booking;
      writeBookings(bookings);
      return res.status(400).json({ error: 'Invalid payment signature' });
    }

    markPaid(booking, {
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      razorpaySignature: razorpay_signature,
    });
    bookings[index] = booking;
    writeBookings(bookings);
    queueReceiptEmail(booking.id);

    res.json({
      success: true,
      booking,
      receiptEmailQueued: true,
    });
  } catch (err) {
    console.error('verify failed', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

module.exports = router;
