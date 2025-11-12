import { Router } from 'express';
import { authenticate } from '../middleware/auth';

const router = Router();

// TODO: Full Supabase Storage migration needed
// Temporary stub to allow server startup

router.post('/upload', authenticate, async (req, res) => {
  res.status(501).json({ error: 'Document routes not yet migrated to Supabase Storage' });
});

router.get('/:id', authenticate, async (req, res) => {
  res.status(501).json({ error: 'Document routes not yet migrated to Supabase Storage' });
});

router.delete('/:id', authenticate, async (req, res) => {
  res.status(501).json({ error: 'Document routes not yet migrated to Supabase Storage' });
});

export default router;
