import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = Router();
const prisma = new PrismaClient();

// Get all properties for the authenticated property manager
router.get('/', authenticate, authorize('PROPERTY_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const properties = await prisma.property.findMany({
      where: { managerId: userId },
      include: {
        _count: {
          select: {
            projects: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    res.json(properties);
  } catch (error) {
    console.error('Error fetching properties:', error);
    res.status(500).json({ error: 'Failed to fetch properties' });
  }
});

// Get single property
router.get('/:id', authenticate, authorize('PROPERTY_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const property = await prisma.property.findFirst({
      where: { id, managerId: userId },
      include: {
        projects: {
          orderBy: { createdAt: 'desc' },
        },
      },
    });

    if (!property) {
      return res.status(404).json({ error: 'Property not found' });
    }

    res.json(property);
  } catch (error) {
    console.error('Error fetching property:', error);
    res.status(500).json({ error: 'Failed to fetch property' });
  }
});

// Create property
router.post(
  '/',
  authenticate,
  authorize('PROPERTY_MANAGER'),
  [
    body('name').trim().notEmpty(),
    body('address').trim().notEmpty(),
    body('city').trim().notEmpty(),
    body('state').trim().notEmpty(),
    body('zipCode').trim().notEmpty(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const userId = req.user!.id;
      const { name, address, city, state, zipCode } = req.body;

      const property = await prisma.property.create({
        data: {
          name,
          address,
          city,
          state,
          zipCode,
          managerId: userId,
        },
      });

      res.status(201).json(property);
    } catch (error) {
      console.error('Error creating property:', error);
      res.status(500).json({ error: 'Failed to create property' });
    }
  }
);

// Update property
router.put(
  '/:id',
  authenticate,
  authorize('PROPERTY_MANAGER'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const existingProperty = await prisma.property.findFirst({
        where: { id, managerId: userId },
      });

      if (!existingProperty) {
        return res.status(404).json({ error: 'Property not found or access denied' });
      }

      const { name, address, city, state, zipCode } = req.body;

      const property = await prisma.property.update({
        where: { id },
        data: {
          ...(name && { name }),
          ...(address && { address }),
          ...(city && { city }),
          ...(state && { state }),
          ...(zipCode && { zipCode }),
        },
      });

      res.json(property);
    } catch (error) {
      console.error('Error updating property:', error);
      res.status(500).json({ error: 'Failed to update property' });
    }
  }
);

// Delete property
router.delete(
  '/:id',
  authenticate,
  authorize('PROPERTY_MANAGER'),
  async (req: AuthRequest, res) => {
    try {
      const { id } = req.params;
      const userId = req.user!.id;

      const property = await prisma.property.findFirst({
        where: { id, managerId: userId },
      });

      if (!property) {
        return res.status(404).json({ error: 'Property not found or access denied' });
      }

      await prisma.property.delete({ where: { id } });

      res.json({ message: 'Property deleted successfully' });
    } catch (error) {
      console.error('Error deleting property:', error);
      res.status(500).json({ error: 'Failed to delete property' });
    }
  }
);

export default router;
