import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Get user profile
router.get('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, phone, role, company, verified, created_at')
      .eq('id', userId)
      .single();

    if (error || !user) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      company: user.company,
      verified: user.verified,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// Update user profile
router.put('/profile', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const { firstName, lastName, phone, company } = req.body;

    const updateData: any = {};
    if (firstName) updateData.first_name = firstName;
    if (lastName) updateData.last_name = lastName;
    if (phone !== undefined) updateData.phone = phone;
    if (company !== undefined) updateData.company = company;

    const { data: user, error } = await supabaseAdmin
      .from('users')
      .update(updateData)
      .eq('id', userId)
      .select('id, email, first_name, last_name, phone, role, company, verified, created_at')
      .single();

    if (error || !user) {
      console.error('Error updating user profile:', error);
      return res.status(500).json({ error: 'Failed to update user profile' });
    }

    res.json({
      id: user.id,
      email: user.email,
      firstName: user.first_name,
      lastName: user.last_name,
      phone: user.phone,
      role: user.role,
      company: user.company,
      verified: user.verified,
      createdAt: user.created_at,
    });
  } catch (error) {
    console.error('Error updating user profile:', error);
    res.status(500).json({ error: 'Failed to update user profile' });
  }
});

export default router;
