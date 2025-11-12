import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// TODO: Full Supabase migration needed
// Temporary stub to allow server startup

router.get('/', authenticate, async (req, res) => {
  res.json([]);
});

router.post('/', authenticate, async (req, res) => {
  res.status(501).json({ error: 'Message routes not yet migrated to Supabase' });
});

router.put('/:id/read', authenticate, async (req, res) => {
  res.status(501).json({ error: 'Message routes not yet migrated to Supabase' });
});

export default router;
