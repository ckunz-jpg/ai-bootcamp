import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { notifyUsers } from '../socket';

const router = Router();
const prisma = new PrismaClient();

// Get all projects (filtered by role)
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;
    const role = req.user!.role;
    const { status, type } = req.query;

    let where: any = {};

    // Property managers see only their projects
    if (role === 'PROPERTY_MANAGER') {
      where.managerId = userId;
    }
    // Vendors see all open projects
    else if (role === 'VENDOR') {
      where.status = 'OPEN';
    }

    if (status) {
      where.status = status;
    }
    if (type) {
      where.type = type;
    }

    const projects = await prisma.project.findMany({
      where,
      include: {
        property: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            email: true,
          },
        },
        bids: {
          select: {
            id: true,
            amount: true,
            status: true,
            vendorId: true,
          },
        },
        _count: {
          select: {
            bids: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

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

    const project = await prisma.project.findUnique({
      where: { id },
      include: {
        property: true,
        manager: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
            email: true,
            phone: true,
          },
        },
        bids: {
          include: {
            vendor: {
              select: {
                id: true,
                firstName: true,
                lastName: true,
                company: true,
                email: true,
              },
            },
            documents: true,
          },
        },
        documents: true,
      },
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Check permissions
    if (role === 'PROPERTY_MANAGER' && project.managerId !== userId) {
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
      const { title, description, type, budget, startDate, endDate, propertyId, deadline } = req.body;

      // Verify property belongs to manager
      const property = await prisma.property.findFirst({
        where: { id: propertyId, managerId: userId },
      });

      if (!property) {
        return res.status(403).json({ error: 'Property not found or access denied' });
      }

      const project = await prisma.project.create({
        data: {
          title,
          description,
          type,
          budget: budget ? parseFloat(budget) : null,
          startDate: startDate ? new Date(startDate) : null,
          endDate: endDate ? new Date(endDate) : null,
          deadline: deadline ? new Date(deadline) : null,
          propertyId,
          managerId: userId,
        },
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
      });

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
      const existingProject = await prisma.project.findFirst({
        where: { id, managerId: userId },
      });

      if (!existingProject) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }

      const { title, description, type, budget, startDate, endDate, status, deadline } = req.body;

      const project = await prisma.project.update({
        where: { id },
        data: {
          ...(title && { title }),
          ...(description && { description }),
          ...(type && { type }),
          ...(budget !== undefined && { budget: parseFloat(budget) }),
          ...(startDate && { startDate: new Date(startDate) }),
          ...(endDate && { endDate: new Date(endDate) }),
          ...(deadline && { deadline: new Date(deadline) }),
          ...(status && { status }),
        },
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
      });

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
      const project = await prisma.project.findFirst({
        where: { id, managerId: userId },
      });

      if (!project) {
        return res.status(404).json({ error: 'Project not found or access denied' });
      }

      await prisma.project.delete({ where: { id } });

      res.json({ message: 'Project deleted successfully' });
    } catch (error) {
      console.error('Error deleting project:', error);
      res.status(500).json({ error: 'Failed to delete project' });
    }
  }
);

export default router;
