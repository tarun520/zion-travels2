const express = require('express');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const { normalizePeriods } = require('../services/availability');

const router = express.Router();
const dataPath = path.join(__dirname, '..', 'data', 'cars.json');

function readCars() {
  const raw = fs.readFileSync(dataPath, 'utf8');
  return JSON.parse(raw);
}

function writeCars(cars) {
  fs.writeFileSync(dataPath, JSON.stringify(cars, null, 2));
}

function sanitizeUnavailablePeriods(periods) {
  if (!Array.isArray(periods)) {
    return [];
  }

  return periods
    .map((period) => ({
      id: period.id || uuidv4(),
      startAt: String(period.startAt),
      endAt: String(period.endAt),
      note: period.note ? String(period.note).trim() : '',
    }))
    .filter((period) => {
      const start = new Date(period.startAt);
      const end = new Date(period.endAt);
      return !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end > start;
    });
}

function normalizeCar(car) {
  return {
    ...car,
    unavailablePeriods: sanitizeUnavailablePeriods(normalizePeriods(car)),
  };
}

router.get('/', (_req, res) => {
  try {
    res.json(readCars().map(normalizeCar));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load cars' });
  }
});

router.get('/:id', (req, res) => {
  try {
    const car = readCars().find((c) => c.id === req.params.id);
    if (!car) {
      return res.status(404).json({ error: 'Car not found' });
    }
    res.json(normalizeCar(car));
  } catch (err) {
    res.status(500).json({ error: 'Failed to load car' });
  }
});

router.post('/', (req, res) => {
  try {
    const {
      name,
      brand,
      type,
      price,
      priceUnit = 'day',
      seats,
      quantity = 1,
      transmission,
      fuel,
      image,
      description,
      available = true,
      unavailablePeriods = [],
    } = req.body;

    if (!name || price === undefined || price === null || price === '') {
      return res.status(400).json({ error: 'Name and price are required' });
    }

    const numericPrice = Number(price);
    if (Number.isNaN(numericPrice) || numericPrice < 0) {
      return res.status(400).json({ error: 'Price must be a valid non-negative number' });
    }

    const numericQuantity = Number(quantity);
    if (Number.isNaN(numericQuantity) || numericQuantity < 1) {
      return res.status(400).json({ error: 'Quantity must be at least 1' });
    }

    const cars = readCars();
    const car = {
      id: uuidv4(),
      name: String(name).trim(),
      brand: brand ? String(brand).trim() : '',
      type: type ? String(type).trim() : 'Sedan',
      price: numericPrice,
      priceUnit: priceUnit || 'day',
      seats: seats ? Number(seats) : 5,
      quantity: Math.floor(numericQuantity),
      transmission: transmission || 'Manual',
      fuel: fuel || 'Petrol',
      image: image || 'https://images.unsplash.com/photo-1494976388531-d1058494cdd8?w=800&q=80',
      description: description ? String(description).trim() : '',
      available: Boolean(available),
      unavailablePeriods: sanitizeUnavailablePeriods(unavailablePeriods),
    };

    cars.push(car);
    writeCars(cars);
    res.status(201).json(car);
  } catch (err) {
    res.status(500).json({ error: 'Failed to create car' });
  }
});

router.put('/:id', (req, res) => {
  try {
    const cars = readCars();
    const index = cars.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Car not found' });
    }

    const existing = cars[index];
    const updates = { ...req.body };
    delete updates.id;

    if (updates.price !== undefined) {
      const numericPrice = Number(updates.price);
      if (Number.isNaN(numericPrice) || numericPrice < 0) {
        return res.status(400).json({ error: 'Price must be a valid non-negative number' });
      }
      updates.price = numericPrice;
    }

    if (updates.seats !== undefined) {
      updates.seats = Number(updates.seats);
    }

    if (updates.quantity !== undefined) {
      const numericQuantity = Number(updates.quantity);
      if (Number.isNaN(numericQuantity) || numericQuantity < 1) {
        return res.status(400).json({ error: 'Quantity must be at least 1' });
      }
      updates.quantity = Math.floor(numericQuantity);
    }

    if (updates.available !== undefined) {
      updates.available = Boolean(updates.available);
    }

    if (updates.unavailablePeriods !== undefined) {
      updates.unavailablePeriods = sanitizeUnavailablePeriods(updates.unavailablePeriods);
    }

    const car = normalizeCar({ ...existing, ...updates, id: existing.id });
    cars[index] = car;
    writeCars(cars);
    res.json(car);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update car' });
  }
});

router.delete('/:id', (req, res) => {
  try {
    const cars = readCars();
    const index = cars.findIndex((c) => c.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Car not found' });
    }
    const [removed] = cars.splice(index, 1);
    writeCars(cars);
    res.json(removed);
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete car' });
  }
});

module.exports = router;
