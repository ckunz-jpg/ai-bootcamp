import { Request, Response, NextFunction } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { UserRole } from '../types/supabase';

export interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: UserRole;
  };
  accessToken?: string;
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const token = authHeader.split(' ')[1];

    // Verify the JWT token with Supabase
    const { data: { user: authUser }, error: authError } = await supabaseAdmin.auth.getUser(token);

    if (authError || !authUser) {
      return res.status(401).json({ error: 'Invalid token' });
    }

    // Get user profile from database
    const { data: userProfile, error: profileError } = await supabaseAdmin
      .from('users')
      .select('id, email, role')
      .eq('id', authUser.id)
      .single();

    if (profileError || !userProfile) {
      return res.status(401).json({ error: 'User not found' });
    }

    // Attach user to request
    req.user = {
      id: userProfile.id,
      email: userProfile.email,
      role: userProfile.role as UserRole,
    };
    req.accessToken = token;

    next();
  } catch (error) {
    console.error('Authentication error:', error);
    return res.status(401).json({ error: 'Invalid token' });
  }
};

export const authorize = (...roles: UserRole[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden: Insufficient permissions' });
    }

    next();
  };
};
