import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate, authorize, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';

const router = Router();

// Get all properties for the authenticated property manager
router.get('/', authenticate, authorize('PROPERTY_MANAGER'), async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    const { data: properties, error } = await supabaseAdmin
      .from('properties')
      .select('*, projects(count)')
      .eq('manager_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching properties:', error);
      return res.status(500).json({ error: 'Failed to fetch properties' });
    }

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

    const { data: property, error } = await supabaseAdmin
      .from('properties')
      .select('*, projects(*)')
      .eq('id', id)
      .eq('manager_id', userId)
      .single();

    if (error || !property) {
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

      const { data: property, error } = await supabaseAdmin
        .from('properties')
        .insert({
          name,
          address,
          city,
          state,
          zip_code: zipCode,
          manager_id: userId,
        })
        .select()
        .single();

      if (error || !property) {
        console.error('Error creating property:', error);
        return res.status(500).json({ error: 'Failed to create property' });
      }

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

      const { data: existingProperty } = await supabaseAdmin
        .from('properties')
        .select('id')
        .eq('id', id)
        .eq('manager_id', userId)
        .single();

      if (!existingProperty) {
        return res.status(404).json({ error: 'Property not found or access denied' });
      }

      const { name, address, city, state, zipCode } = req.body;

      const updateData: any = {};
      if (name) updateData.name = name;
      if (address) updateData.address = address;
      if (city) updateData.city = city;
      if (state) updateData.state = state;
      if (zipCode) updateData.zip_code = zipCode;

      const { data: property, error } = await supabaseAdmin
        .from('properties')
        .update(updateData)
        .eq('id', id)
        .select()
        .single();

      if (error || !property) {
        console.error('Error updating property:', error);
        return res.status(500).json({ error: 'Failed to update property' });
      }

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

      const { data: property } = await supabaseAdmin
        .from('properties')
        .select('id')
        .eq('id', id)
        .eq('manager_id', userId)
        .single();

      if (!property) {
        return res.status(404).json({ error: 'Property not found or access denied' });
      }

      const { error } = await supabaseAdmin
        .from('properties')
        .delete()
        .eq('id', id);

      if (error) {
        console.error('Error deleting property:', error);
        return res.status(500).json({ error: 'Failed to delete property' });
      }

      res.json({ message: 'Property deleted successfully' });
    } catch (error) {
      console.error('Error deleting property:', error);
      res.status(500).json({ error: 'Failed to delete property' });
    }
  }
);

export default router;
