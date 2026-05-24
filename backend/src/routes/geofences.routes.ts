import { Router } from 'express';
import { pool } from '../db/pool';
import { requireFullAuth } from '../middleware/auth';

const router = Router();

router.get('/', requireFullAuth, async (_req, res) => {
  try {
    const result = await pool.query(
      `SELECT
         id,
         name,
         is_active,
         created_at,
         ST_AsGeoJSON(boundary::geometry) AS boundary_geojson
       FROM geofences
       WHERE is_active = TRUE
       ORDER BY name ASC`,
    );

    res.json({ geofences: result.rows });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to fetch geofences' });
  }
});

export default router;
