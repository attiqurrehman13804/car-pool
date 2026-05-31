import { Router } from 'express';
import { z } from 'zod';
import { searchAddress, reverseGeocode } from '../services/geocode.service';

const router = Router();

router.get('/search', async (req, res) => {
  try {
    const q = z.string().min(2).parse(req.query.q);
    const results = await searchAddress(q);
    res.json({ results });
  } catch {
    res.status(400).json({ error: 'Invalid search query' });
  }
});

router.get('/reverse', async (req, res) => {
  try {
    const lat = z.coerce.number().parse(req.query.lat);
    const lng = z.coerce.number().parse(req.query.lng);
    const label = await reverseGeocode(lat, lng);
    res.json({ lat, lng, label });
  } catch {
    res.status(400).json({ error: 'Invalid coordinates' });
  }
});

export default router;
