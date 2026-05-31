import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, requireFullAuth } from '../middleware/auth';
import { listVehicles, createVehicle, updateVehicle, deleteVehicle } from '../services/vehicle.service';
import { paramId } from '../utils/params';

const router = Router();

router.get('/', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    res.json({ vehicles: await listVehicles(req.user!.userId) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch vehicles' });
  }
});

router.post('/', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      make: z.string().min(1),
      model: z.string().min(1),
      color: z.string().optional(),
      licensePlate: z.string().optional(),
      seatCapacity: z.number().int().min(1).max(8),
      photoUrl: z.string().optional(),
    });
    const data = schema.parse(req.body);
    const vehicle = await createVehicle(req.user!.userId, data);
    res.status(201).json({ vehicle });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid vehicle data' });
  }
});

router.put('/:id', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      make: z.string().optional(),
      model: z.string().optional(),
      color: z.string().optional(),
      licensePlate: z.string().optional(),
      seatCapacity: z.number().int().min(1).max(8).optional(),
      photoUrl: z.string().optional(),
    });
    const vehicle = await updateVehicle(req.user!.userId, paramId(req.params.id), schema.parse(req.body));
    res.json({ vehicle });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Update failed' });
  }
});

router.delete('/:id', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    await deleteVehicle(req.user!.userId, paramId(req.params.id));
    res.json({ message: 'Vehicle deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete vehicle' });
  }
});

export default router;
