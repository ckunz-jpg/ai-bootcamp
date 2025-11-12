import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// TODO: Full Supabase migration needed
// Temporary stub to allow server startup

router.get('/', authenticate, async (req, res) => {
  res.json([]);
});

router.get('/:id', authenticate, async (req, res) => {
  res.status(501).json({ error: 'Bid routes not yet migrated to Supabase' });
});

router.post('/', authenticate, async (req, res) => {
  res.status(501).json({ error: 'Bid routes not yet migrated to Supabase' });
});

router.put('/:id', authenticate, async (req, res) => {
  res.status(501).json({ error: 'Bid routes not yet migrated to Supabase' });
});

router.delete('/:id', authenticate, async (req, res) => {
  res.status(501).json({ error: 'Bid routes not yet migrated to Supabase' });
});

export default router;
