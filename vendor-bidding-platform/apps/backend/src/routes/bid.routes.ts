import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { Server } from 'socket.io';

const router = Router();

// Get all bids (filtered by role)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { projectId, status } = req.query;

    let query = supabaseAdmin
      .from('bids')
      .select(`
        *,
        vendor:users!bids_vendor_id_fkey(id, first_name, last_name, company, email, phone),
        project:projects(*, property:properties(*))
      `);

    if (role === 'VENDOR') {
      query = query.eq('vendor_id', userId);
    } else if (role === 'PROPERTY_MANAGER') {
      // Get bids for their projects only
      const { data: projects } = await supabaseAdmin
        .from('projects')
        .select('id')
        .eq('manager_id', userId);

      if (projects && projects.length > 0) {
        const projectIds = projects.map(p => p.id);
        query = query.in('project_id', projectIds);
      } else {
        return res.json([]);
      }
    }

    if (projectId) {
      query = query.eq('project_id', projectId);
    }
    if (status) {
      query = query.eq('status', status);
    }

    const { data: bids, error } = await query.order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching bids:', error);
      return res.status(500).json({ error: 'Failed to fetch bids' });
    }

    res.json(bids);
  } catch (error) {
    console.error('Error fetching bids:', error);
    res.status(500).json({ error: 'Failed to fetch bids' });
  }
});

// Get single bid
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    const { data: bid, error } = await supabaseAdmin
      .from('bids')
      .select(`
        *,
        vendor:users!bids_vendor_id_fkey(id, first_name, last_name, company, email, phone),
        project:projects(
          *,
          property:properties(*),
          manager:users!projects_manager_id_fkey(id, first_name, last_name, company)
        ),
        documents(*)
      `)
      .eq('id', id)
      .single();

    if (error || !bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Check permissions
    if (role === 'VENDOR' && bid.vendor_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (role === 'PROPERTY_MANAGER' && bid.project.manager_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    res.json(bid);
  } catch (error) {
    console.error('Error fetching bid:', error);
    res.status(500).json({ error: 'Failed to fetch bid' });
  }
});

// Create bid
router.post(
  '/',
  authenticate,
  authorize('VENDOR'),
  [
    body('projectId').isUUID(),
    body('amount').isFloat({ min: 0 }),
    body('description').trim().notEmpty(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user!.id;
      const { projectId, amount, description, timeline, notes } = req.body;

      // Verify project exists and is open
      const { data: project, error: projectError } = await supabaseAdmin
        .from('projects')
        .select('id, title, status, manager_id')
        .eq('id', projectId)
        .single();

      if (projectError || !project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.status !== 'OPEN') {
        return res.status(400).json({ error: 'Project is not accepting bids' });
      }

      // Check if vendor already submitted a bid
      const { data: existingBid } = await supabaseAdmin
        .from('bids')
        .select('id')
        .eq('project_id', projectId)
        .eq('vendor_id', userId)
        .single();

      if (existingBid) {
        return res.status(400).json({ error: 'You have already submitted a bid for this project' });
      }

      // Create bid
      const { data: bid, error: bidError } = await supabaseAdmin
        .from('bids')
        .insert({
          project_id: projectId,
          vendor_id: userId,
          amount: parseFloat(amount),
          description,
          timeline: timeline || null,
          notes: notes || null,
        })
        .select(`
          *,
          vendor:users!bids_vendor_id_fkey(id, first_name, last_name, company),
          project:projects(*)
        `)
        .single();

      if (bidError || !bid) {
        console.error('Error creating bid:', bidError);
        return res.status(500).json({ error: 'Failed to create bid' });
      }

      // Create notification for property manager
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: project.manager_id,
          title: 'New Bid Received',
          message: `${bid.vendor.first_name} ${bid.vendor.last_name} submitted a bid for "${project.title}"`,
          type: 'bid_received',
          link: `/projects/${projectId}`,
        });

      // Emit real-time notification
      const io: Server = req.app.get('io');
      io.to(`user_${project.manager_id}`).emit('notification', {
        title: 'New Bid Received',
        message: `${bid.vendor.first_name} ${bid.vendor.last_name} submitted a bid for "${project.title}"`,
        type: 'bid_received',
        link: `/projects/${projectId}`,
      });

      res.status(201).json(bid);
    } catch (error) {
      console.error('Error creating bid:', error);
      res.status(500).json({ error: 'Failed to create bid' });
    }
  }
);

// Update bid
router.put(
  '/:id',
  authenticate,
  authorize('VENDOR'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      // Verify ownership
      const { data: existingBid } = await supabaseAdmin
        .from('bids')
        .select('vendor_id, status')
        .eq('id', id)
        .eq('vendor_id', userId)
        .single();

      if (!existingBid) {
        return res.status(404).json({ error: 'Bid not found or access denied' });
      }

      if (existingBid.status !== 'PENDING') {
        return res.status(400).json({ error: 'Cannot update bid with status: ' + existingBid.status });
      }

      const { amount, description, timeline, notes } = req.body;

      const updateData: any = {};
      if (amount !== undefined) updateData.amount = parseFloat(amount);
      if (description) updateData.description = description;
      if (timeline) updateData.timeline = timeline;
      if (notes !== undefined) updateData.notes = notes;

      const { data: bid, error } = await supabaseAdmin
        .from('bids')
        .update(updateData)
        .eq('id', id)
        .select(`
          *,
          vendor:users!bids_vendor_id_fkey(id, first_name, last_name, company),
          project:projects(*)
        `)
        .single();

      if (error || !bid) {
        console.error('Error updating bid:', error);
        return res.status(500).json({ error: 'Failed to update bid' });
      }

      res.json(bid);
    } catch (error) {
      console.error('Error updating bid:', error);
      res.status(500).json({ error: 'Failed to update bid' });
    }
  }
);

// Accept/Reject bid (Property Manager only)
router.patch(
  '/:id/status',
  authenticate,
  authorize('PROPERTY_MANAGER'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const { status } = req.body;
      const userId = req.user!.id;

      if (!['ACCEPTED', 'REJECTED'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }

      const { data: bid, error: bidError } = await supabaseAdmin
        .from('bids')
        .select(`
          *,
          project:projects(id, title, manager_id),
          vendor:users!bids_vendor_id_fkey(id, first_name, last_name)
        `)
        .eq('id', id)
        .single();

      if (bidError || !bid) {
        return res.status(404).json({ error: 'Bid not found' });
      }

      // Verify the project belongs to this manager
      if (bid.project.manager_id !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      // Update bid status
      const { data: updatedBid, error: updateError } = await supabaseAdmin
        .from('bids')
        .update({ status })
        .eq('id', id)
        .select(`
          *,
          vendor:users!bids_vendor_id_fkey(id, first_name, last_name, company),
          project:projects(*)
        `)
        .single();

      if (updateError || !updatedBid) {
        console.error('Error updating bid status:', updateError);
        return res.status(500).json({ error: 'Failed to update bid status' });
      }

      // If accepted, update project status and reject other bids
      if (status === 'ACCEPTED') {
        await supabaseAdmin
          .from('projects')
          .update({ status: 'AWARDED' })
          .eq('id', bid.project_id);

        // Reject all other pending bids
        await supabaseAdmin
          .from('bids')
          .update({ status: 'REJECTED' })
          .eq('project_id', bid.project_id)
          .neq('id', id)
          .eq('status', 'PENDING');
      }

      // Create notification for vendor
      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: bid.vendor_id,
          title: status === 'ACCEPTED' ? 'Bid Accepted!' : 'Bid Update',
          message: `Your bid for "${bid.project.title}" has been ${status.toLowerCase()}`,
          type: status === 'ACCEPTED' ? 'bid_accepted' : 'bid_rejected',
          link: `/bids/${id}`,
        });

      // Emit real-time notification
      const io: Server = req.app.get('io');
      io.to(`user_${bid.vendor_id}`).emit('notification', {
        title: status === 'ACCEPTED' ? 'Bid Accepted!' : 'Bid Update',
        message: `Your bid for "${bid.project.title}" has been ${status.toLowerCase()}`,
        type: status === 'ACCEPTED' ? 'bid_accepted' : 'bid_rejected',
        link: `/bids/${id}`,
      });

      res.json(updatedBid);
    } catch (error) {
      console.error('Error updating bid status:', error);
      res.status(500).json({ error: 'Failed to update bid status' });
    }
  }
);

// Withdraw bid
router.delete(
  '/:id',
  authenticate,
  authorize('VENDOR'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const { data: bid } = await supabaseAdmin
        .from('bids')
        .select('vendor_id, status')
        .eq('id', id)
        .eq('vendor_id', userId)
        .single();

      if (!bid) {
        return res.status(404).json({ error: 'Bid not found or access denied' });
      }

      if (bid.status !== 'PENDING') {
        return res.status(400).json({ error: 'Can only withdraw pending bids' });
      }

      const { error } = await supabaseAdmin
        .from('bids')
        .update({ status: 'WITHDRAWN' })
        .eq('id', id);

      if (error) {
        console.error('Error withdrawing bid:', error);
        return res.status(500).json({ error: 'Failed to withdraw bid' });
      }

      res.json({ message: 'Bid withdrawn successfully' });
    } catch (error) {
      console.error('Error withdrawing bid:', error);
      res.status(500).json({ error: 'Failed to withdraw bid' });
    }
  }
);

export default router;
