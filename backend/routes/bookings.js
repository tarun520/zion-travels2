const express = require('express');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const { v4: uuidv4 } = require('uuid');
const Razorpay = require('razorpay');

const router = express.Router();
const bookingsPath = path.join(__dirname, '..', 'data', 'bookings.json');
const carsPath = path.join(__dirname, '..', 'data', 'cars.json');

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

    const cars = readJson(carsPath);
    const car = cars.find((c) => c.id === carId);
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }
    if (!car.available) {
      return res.status(400).json({ error: 'Car is not available for booking' });
    }

    const days = daysBetween(startDate, endDate);
    const amountInr = Number(car.price) * days;
    if (!amountInr || amountInr <= 0) {
      return res.status(400).json({ error: 'Invalid booking amount' });
    }

    const amountPaise = Math.round(amountInr * 100);
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
      amountInr,
      amountPaise,
      currency: 'INR',
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
      amountInr,
    });
  } catch (err) {
    console.error('create-order failed', err);
    res.status(500).json({ error: err?.error?.description || err.message || 'Failed to create order' });
  }
});

router.post('/verify', (req, res) => {
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

    if (booking.demoMode || demoConfirm) {
      booking.status = 'paid';
      booking.razorpayPaymentId = razorpay_payment_id || `demo_pay_${Date.now()}`;
      booking.razorpayOrderId = razorpay_order_id || booking.razorpayOrderId;
      booking.paidAt = new Date().toISOString();
      bookings[index] = booking;
      writeBookings(bookings);
      return res.json({ success: true, booking, demoMode: true });
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

    booking.status = 'paid';
    booking.razorpayOrderId = razorpay_order_id;
    booking.razorpayPaymentId = razorpay_payment_id;
    booking.razorpaySignature = razorpay_signature;
    booking.paidAt = new Date().toISOString();
    bookings[index] = booking;
    writeBookings(bookings);

    res.json({ success: true, booking });
  } catch (err) {
    console.error('verify failed', err);
    res.status(500).json({ error: 'Failed to verify payment' });
  }
});

module.exports = router;
