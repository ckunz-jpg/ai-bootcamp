import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = Router();

// Get all projects (filtered by role)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;

    let query = supabaseAdmin
      .from('projects')
      .select('*, property:properties(*), bids(count)');

    // Property managers see only their projects
    if (role === 'PROPERTY_MANAGER') {
      query = query.eq('manager_id', userId);
    }
    // Vendors see all open projects
    else if (role === 'VENDOR') {
      query = query.eq('status', 'OPEN');
    }

    const { data: projects, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching projects:', error);
      return res.status(500).json({ error: 'Failed to fetch projects' });
    }

    res.json(projects);
  } catch (error) {
    console.error('Error fetching projects:', error);
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// Get single project
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    const { data: project, error } = await supabaseAdmin
      .from('projects')
      .select('*, property:properties(*), bids(*, vendor:users(*)), documents(*)')
      .eq('id', id)
      .single();

    if (error || !project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permissions
    if (role === 'PROPERTY_MANAGER' && project.manager_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(project);
  } catch (error) {
    console.error('Error fetching project:', error);
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// Create project
router.post(
  '/',
  authenticate,
  authorize('PROPERTY_MANAGER'),
  [
    body('title').trim().notEmpty(),
    body('description').trim().notEmpty(),
    body('type').isIn(['CONSTRUCTION', 'MAINTENANCE', 'EVENT', 'LANDSCAPING', 'CLEANING', 'OTHER']),
    body('propertyId').isUUID(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user!.id;
      const { title, description, type, budget, timeline, propertyId, deadline } = req.body;

      // Verify property belongs to manager
      const { data: property } = await supabaseAdmin
        .from('properties')
        .select('id')
        .eq('id', propertyId)
        .eq('manager_id', userId)
        .single();

      if (!property) {
        return res.status(403).json({ error: 'Property not found or access denied' });
      }

      const { data: project, error } = await supabaseAdmin
        .from('projects')
        .insert({
          title,
          description,
          type,
          budget: budget ? parseFloat(budget) : null,
          timeline: timeline || null,
          deadline: deadline ? new Date(deadline).toISOString() : null,
          property_id: propertyId,
          manager_id: userId,
        })
        .select('*, property:properties(*)')
        .single();

      if (error || !project) {
        console.error('Error creating project:', error);
        return res.status(500).json({ error: 'Failed to create project' });
      }

      res.status(201).json(project);
    } catch (error) {
      console.error('Error creating project:', error);
      res.status(500).json({ error: 'Failed to create project' });
    }
  }
);

// Update project
router.put(
  '/:id',
  authenticate,
  authorize('PROPERTY_MANAGER'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verify ownership
      const { data: existingProject } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('id', id)
        .eq('manager_id', userId)
        .single();

      if (!existingProject) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }

      const { title, description, type, budget, timeline, status, deadline } = req.body;

      const updateData: any = {};
      if (title) updateData.title = title;
      if (description) updateData.description = description;
      if (type) updateData.type = type;
      if (budget !== undefined) updateData.budget = parseFloat(budget);
      if (timeline) updateData.timeline = timeline;
      if (deadline) updateData.deadline = new Date(deadline).toISOString();
      if (status) updateData.status = status;

      const { data: project, error } = await supabaseAdmin
        .from('projects')
        .update(updateData)
        .eq('id', id)
        .select('*, property:properties(*)')
        .single();

      if (error || !project) {
        console.error('Error updating project:', error);
        return res.status(500).json({ error: 'Failed to update project' });
      }

      res.json(project);
    } catch (error) {
      console.error('Error updating project:', error);
      res.status(500).json({ error: 'Failed to update project' });
    }
  }
);

// Delete project
router.delete(
  '/:id',
  authenticate,
  authorize('PROPERTY_MANAGER'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verify ownership
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('id', id)
        .eq('manager_id', userId)
        .single();

      if (!project) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }

      const { error } = await supabaseAdmin
        .from('projects')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting project:', error);
        return res.status(500).json({ error: 'Failed to delete project' });
      }

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }
);

export default router;
