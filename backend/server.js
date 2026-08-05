require('dotenv').config();

const express = require('express');
const cors = require('cors');
const carsRouter = require('./routes/cars');
const bookingsRouter = require('./routes/bookings');

const app = express();
const PORT = process.env.PORT || 5055;

app.use(cors());
app.use(express.json());

app.get('/api/health', (_req, res) => {
  res.json({
    status: 'ok',
    service: 'zion-travels-api',
    razorpayConfigured: Boolean(
      process.env.RAZORPAY_KEY_ID &&
        process.env.RAZORPAY_KEY_SECRET &&
        !process.env.RAZORPAY_KEY_ID.includes('ReplaceWith')
    ),
  });
});

app.use('/api/cars', carsRouter);
app.use('/api/bookings', bookingsRouter);

app.use((err, _req, res, _next) => {
  console.error(err);
  res.status(500).json({ error: 'Internal server error' });
});

app.listen(PORT, () => {
  console.log(`Zion Travels API running on http://localhost:${PORT}`);
});
