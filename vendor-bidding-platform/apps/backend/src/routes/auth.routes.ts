import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';

const router = Router();

// Register
router.post(
  '/register',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').isLength({ min: 6 }),
    body('firstName').trim().notEmpty(),
    body('lastName').trim().notEmpty(),
    body('role').isIn(['PROPERTY_MANAGER', 'VENDOR']),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password, firstName, lastName, role, phone, company } = req.body;

      // Create user with Supabase Auth
      const { data, error } = await supabaseAdmin.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            role,
            phone: phone || null,
            company: company || null,
          },
        },
      });

      if (error) {
        console.error('Registration error:', error);
        if (error.message.includes('already registered')) {
          return res.status(400).json({ error: 'Email already registered' });
        }
        return res.status(400).json({ error: error.message });
      }

      if (!data.user || !data.session) {
        return res.status(500).json({ error: 'Failed to create user' });
      }

      // Get the created user profile
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, role, phone, company, created_at')
        .eq('id', data.user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('Profile fetch error:', profileError);
        return res.status(500).json({ error: 'User created but profile not found' });
      }

      // Return user and access token
      res.status(201).json({
        user: {
          id: userProfile.id,
          email: userProfile.email,
          firstName: userProfile.first_name,
          lastName: userProfile.last_name,
          role: userProfile.role,
          phone: userProfile.phone,
          company: userProfile.company,
          createdAt: userProfile.created_at,
        },
        token: data.session.access_token,
      });
    } catch (error) {
      console.error('Registration error:', error);
      res.status(500).json({ error: 'Failed to register user' });
    }
  }
);

// Login
router.post(
  '/login',
  [
    body('email').isEmail().normalizeEmail(),
    body('password').notEmpty(),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { email, password } = req.body;

      // Sign in with Supabase Auth
      const { data, error } = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user || !data.session) {
        return res.status(401).json({ error: 'Invalid credentials' });
      }

      // Get user profile
      const { data: userProfile, error: profileError } = await supabaseAdmin
        .from('users')
        .select('id, email, first_name, last_name, role, phone, company, verified, created_at')
        .eq('id', data.user.id)
        .single();

      if (profileError || !userProfile) {
        console.error('Profile fetch error:', profileError);
        return res.status(500).json({ error: 'User profile not found' });
      }

      res.json({
        user: {
          id: userProfile.id,
          email: userProfile.email,
          firstName: userProfile.first_name,
          lastName: userProfile.last_name,
          role: userProfile.role,
          phone: userProfile.phone,
          company: userProfile.company,
          verified: userProfile.verified,
          createdAt: userProfile.created_at,
        },
        token: data.session.access_token,
      });
    } catch (error) {
      console.error('Login error:', error);
      res.status(500).json({ error: 'Failed to login' });
    }
  }
);

// Get current user
router.get('/me', authenticate, async (req: AuthRequest, res) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: 'User not authenticated' });
    }

    // Get full user profile
    const { data: userProfile, error } = await supabaseAdmin
      .from('users')
      .select('id, email, first_name, last_name, role, phone, company, verified, created_at')
      .eq('id', req.user.id)
      .single();

    if (error || !userProfile) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json({
      id: userProfile.id,
      email: userProfile.email,
      firstName: userProfile.first_name,
      lastName: userProfile.last_name,
      role: userProfile.role,
      phone: userProfile.phone,
      company: userProfile.company,
      verified: userProfile.verified,
      createdAt: userProfile.created_at,
    });
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ error: 'Failed to get user' });
  }
});

export default router;
