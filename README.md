# Zion Travels

Angular frontend + Node.js Express backend for Zion Travels car rentals, with Razorpay booking.

## Structure

- `frontend/` — Angular 19 app (home, booking, admin)
- `backend/` — Express API for cars + Razorpay bookings

## Prerequisites

- Node.js 18+ (recommended: 20 or 22)
- Razorpay test/live keys from [Razorpay Dashboard](https://dashboard.razorpay.com/app/keys)

## Setup

```bash
npm run install:all
cp backend/.env.example backend/.env
# Edit backend/.env and set RAZORPAY_KEY_ID + RAZORPAY_KEY_SECRET
```

Without real keys, booking still works in **demo mode** (no live charge).

## Run

```bash
# Terminal 1 — API on http://localhost:5055
npm run backend

# Terminal 2 — Angular on http://localhost:4200
npm run frontend
```

## Booking + Razorpay

1. Open home → **Our Cars** → **Book Now**
2. Enter customer details and dates
3. Click **Pay with Razorpay**
4. Complete checkout (test cards in Razorpay docs)

Bookings are stored in `backend/data/bookings.json`.

## Admin

Open [http://localhost:4200/admin](http://localhost:4200/admin) to add cars and prices.

## API

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/cars` | List cars |
| POST | `/api/cars` | Add a car |
| PUT | `/api/cars/:id` | Update a car |
| DELETE | `/api/cars/:id` | Delete a car |
| GET | `/api/bookings/config` | Razorpay public config |
| POST | `/api/bookings/create-order` | Create booking + Razorpay order |
| POST | `/api/bookings/verify` | Verify payment signature |
| GET | `/api/bookings` | List bookings |
