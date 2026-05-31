import { Router } from 'express';
import { z } from 'zod';
import { AuthRequest, requireFullAuth } from '../middleware/auth';
import {
  getProfile,
  updateProfile,
  listEmergencyContacts,
  addEmergencyContact,
  deleteEmergencyContact,
  uploadAvatar,
} from '../services/profile.service';
import { paramId } from '../utils/params';

const router = Router();

router.get('/', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const profile = await getProfile(req.user!.userId);
    res.json({ profile });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch profile' });
  }
});

router.put('/', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      fullName: z.string().optional(),
      phone: z.string().optional(),
      profilePhotoUrl: z.string().optional(),
      defaultRole: z.enum(['driver', 'rider', 'both']).optional(),
    });
    const data = schema.parse(req.body);
    const profile = await updateProfile(req.user!.userId, {
      fullName: data.fullName,
      phone: data.phone,
      profilePhotoUrl: data.profilePhotoUrl,
      defaultRole: data.defaultRole,
    });
    res.json({ profile });
  } catch (error) {
    res.status(400).json({ error: 'Invalid profile data' });
  }
});

router.post('/avatar', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({ base64: z.string(), mimeType: z.string() });
    const { base64, mimeType } = schema.parse(req.body);
    res.json(await uploadAvatar(req.user!.userId, base64, mimeType));
  } catch (error) {
    res.status(400).json({ error: 'Invalid avatar data' });
  }
});

router.get('/emergency-contacts', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    res.json({ contacts: await listEmergencyContacts(req.user!.userId) });
  } catch {
    res.status(500).json({ error: 'Failed to fetch contacts' });
  }
});

router.post('/emergency-contacts', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    const schema = z.object({
      name: z.string().min(1),
      phone: z.string().min(1),
      relationship: z.string().optional(),
      isPrimary: z.boolean().optional(),
    });
    const data = schema.parse(req.body);
    const contact = await addEmergencyContact(req.user!.userId, data);
    res.status(201).json({ contact });
  } catch {
    res.status(400).json({ error: 'Invalid contact data' });
  }
});

router.delete('/emergency-contacts/:id', requireFullAuth, async (req: AuthRequest, res) => {
  try {
    await deleteEmergencyContact(req.user!.userId, paramId(req.params.id));
    res.json({ message: 'Contact deleted' });
  } catch {
    res.status(500).json({ error: 'Failed to delete contact' });
  }
});

export default router;
