import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { Server } from 'socket.io';

const router = Router();
const prisma = new PrismaClient();

// Get all bids (filtered by role)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { projectId, status } = req.query;

    let where: any = {};

    if (role === 'VENDOR') {
      where.vendorId = userId;
    } else if (role === 'PROPERTY_MANAGER') {
      // Get bids for their projects only
      const projects = await prisma.project.findMany({
        where: { managerId: userId },
        select: { id: true },
      });
      where.projectId = { in: projects.map(p => p.id) };
    }

    if (projectId) {
      where.projectId = projectId;
    }
    if (status) {
      where.status = status;
    }

    const bids = await prisma.bid.findMany({
      where,
      include: {
        vendor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            email: true,
            phone: true,
          },
        },
        project: {
          include: {
            property: true,
          },
        },
        documents: true,
      },
      orderBy: { createdAt: 'desc' },
    });

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

    const bid = await prisma.bid.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            email: true,
            phone: true,
          },
        },
        project: {
          include: {
            property: true,
            manager: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
              },
            },
          },
        },
        documents: true,
      },
    });

    if (!bid) {
      return res.status(404).json({ error: 'Bid not found' });
    }

    // Check permissions
    if (role === 'VENDOR' && bid.vendorId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }
    if (role === 'PROPERTY_MANAGER' && bid.project.managerId !== userId) {
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
      const project = await prisma.project.findUnique({
        where: { id: projectId },
        include: { manager: true },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found' });
      }

      if (project.status !== 'OPEN') {
        return res.status(400).json({ error: 'Project is not accepting bids' });
      }

      // Check if vendor already submitted a bid
      const existingBid = await prisma.bid.findFirst({
        where: { projectId, vendorId: userId },
      });

      if (existingBid) {
        return res.status(400).json({ error: 'You have already submitted a bid for this project' });
      }

      const bid = await prisma.bid.create({
        data: {
          projectId,
          vendorId: userId,
          amount: parseFloat(amount),
          description,
          timeline,
          notes,
        },
        include: {
          vendor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
            },
          },
          project: true,
        },
      });

      // Create notification for property manager
      await prisma.notification.create({
        data: {
          userId: project.managerId,
          title: 'New Bid Received',
          message: `${bid.vendor.firstName} ${bid.vendor.lastName} submitted a bid for "${project.title}"`,
          type: 'bid_received',
          link: `/projects/${projectId}`,
        },
      });

      // Emit real-time notification
      const io: Server = req.app.get('io');
      io.to(`user_${project.managerId}`).emit('notification', {
        title: 'New Bid Received',
        message: `${bid.vendor.firstName} ${bid.vendor.lastName} submitted a bid for "${project.title}"`,
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
      const existingBid = await prisma.bid.findFirst({
        where: { id, vendorId: userId },
      });

      if (!existingBid) {
        return res.status(404).json({ error: 'Bid not found or access denied' });
      }

      if (existingBid.status !== 'PENDING') {
        return res.status(400).json({ error: 'Cannot update bid with status: ' + existingBid.status });
      }

      const { amount, description, timeline, notes } = req.body;

      const bid = await prisma.bid.update({
        where: { id },
        data: {
          ...(amount !== undefined && { amount: parseFloat(amount) }),
          ...(description && { description }),
          ...(timeline && { timeline }),
          ...(notes !== undefined && { notes }),
        },
        include: {
          vendor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
            },
          },
          project: true,
        },
      });

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

      const bid = await prisma.bid.findUnique({
        where: { id },
        include: {
          project: true,
          vendor: true,
        },
      });

      if (!bid) {
        return res.status(404).json({ error: 'Bid not found' });
      }

      // Verify the project belongs to this manager
      if (bid.project.managerId !== userId) {
        return res.status(403).json({ error: 'Access denied' });
      }

      const updatedBid = await prisma.bid.update({
        where: { id },
        data: { status },
        include: {
          vendor: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
            },
          },
          project: true,
        },
      });

      // If accepted, update project status and reject other bids
      if (status === 'ACCEPTED') {
        await prisma.project.update({
          where: { id: bid.projectId },
          data: { status: 'AWARDED' },
        });

        // Reject all other pending bids
        await prisma.bid.updateMany({
          where: {
            projectId: bid.projectId,
            id: { not: id },
            status: 'PENDING',
          },
          data: { status: 'REJECTED' },
        });
      }

      // Create notification for vendor
      await prisma.notification.create({
        data: {
          userId: bid.vendorId,
          title: status === 'ACCEPTED' ? 'Bid Accepted!' : 'Bid Update',
          message: `Your bid for "${bid.project.title}" has been ${status.toLowerCase()}`,
          type: status === 'ACCEPTED' ? 'bid_accepted' : 'bid_rejected',
          link: `/bids/${id}`,
        },
      });

      // Emit real-time notification
      const io: Server = req.app.get('io');
      io.to(`user_${bid.vendorId}`).emit('notification', {
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

      const bid = await prisma.bid.findFirst({
        where: { id, vendorId: userId },
      });

      if (!bid) {
        return res.status(404).json({ error: 'Bid not found or access denied' });
      }

      if (bid.status !== 'PENDING') {
        return res.status(400).json({ error: 'Can only withdraw pending bids' });
      }

      await prisma.bid.update({
        where: { id },
        data: { status: 'WITHDRAWN' },
      });

      res.json({ message: 'Bid withdrawn successfully' });
    } catch (error) {
      console.error('Error withdrawing bid:', error);
      res.status(500).json({ error: 'Failed to withdraw bid' });
    }
  }
);

export default router;
