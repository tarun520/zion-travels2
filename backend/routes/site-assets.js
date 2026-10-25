const express = require('express');
const fs = require('fs');
const path = require('path');

const router = express.Router();
const dataPath = path.join(__dirname, '..', 'data', 'site-assets.json');

const DEFAULTS = {
  logo: '/zion-logo.jpg',
  heroVideo:
    'https://video.wixstatic.com/video/11062b_802873a9c69b4642966143da07b8ea88/720p/mp4/file.mp4',
  heroPoster: '/wix/banner.jpg',
  aboutMainImage: '/wix/car2-lg.jpg',
  aboutFloatImage: '/wix/car1-lg.jpg',
  carRentalImage: '/wix/car1-lg.jpg',
  chauffeurImage: '/wix/car2-lg.jpg',
  busRentalImage: '/wix/banner.jpg',
};

const FIELDS = Object.keys(DEFAULTS);

function readAssets() {
  try {
    const parsed = JSON.parse(fs.readFileSync(dataPath, 'utf8'));
    return { ...DEFAULTS, ...parsed };
  } catch {
    return { ...DEFAULTS };
  }
}

function sanitizeUrl(value, fallback) {
  const text = String(value ?? '').trim();
  return text || fallback;
}

router.get('/', (_req, res) => {
  res.json(readAssets());
});

router.put('/', (req, res) => {
  try {
    const current = readAssets();
    const next = { ...current };
    for (const field of FIELDS) {
      if (req.body[field] !== undefined) {
        next[field] = sanitizeUrl(req.body[field], DEFAULTS[field]);
      }
    }
    fs.writeFileSync(dataPath, JSON.stringify(next, null, 2));
    res.json(next);
  } catch (err) {
    console.error('site assets update failed', err);
    res.status(500).json({ error: 'Failed to save site assets' });
  }
});

module.exports = router;
