import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, requireFullAuth } from '../middleware/auth';
import {
  createSchedule,
  listSchedules,
  updateSchedule,
  deleteSchedule,
  searchMatches,
} from '../services/matching.service';
import { paramId } from '../utils/params';

const router = Router();

const scheduleSchema = z.object({
  role: z.enum(['driver', 'rider']),
  startLat: z.number(),
  startLng: z.number(),
  endLat: z.number(),
  endLng: z.number(),
  startLabel: z.string().optional(),
  endLabel: z.string().optional(),
  daysOfWeek: z.array(z.number().int().min(1).max(7)),
  departureTime: z.string(),
  returnTime: z.string().optional(),
  vehicleId: z.string().uuid().optional(),
});

router.get('/matches', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    res.json({ matches: await searchMatches(req.user!.userId) });
  } catch {
    res.status(500).json({ error: 'Failed to search matches' });
  }
});

router.get('/', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    res.json({ schedules: await listSchedules(req.user!.userId) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch schedules' });
  }
});

router.post('/', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const data = scheduleSchema.parse(req.body);
    const schedule = await createSchedule(req.user!.userId, data);
    res.status(201).json({ schedule });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Invalid schedule' });
  }
});

router.put('/:id', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const data = scheduleSchema.partial().parse(req.body);
    const schedules = await updateSchedule(req.user!.userId, paramId(req.params.id), data);
    res.json({ schedules });
  } catch (error) {
    res.status(400).json({ error: error instanceof Error ? error.message : 'Update failed' });
  }
});

router.delete('/:id', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    await deleteSchedule(req.user!.userId, paramId(req.params.id));
    res.json({ message: 'Schedule deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete schedule' });
  }
});


export default router;

