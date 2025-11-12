import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import { randomUUID } from 'crypto';

const router = Router();

// Configure multer for memory storage (we'll upload to Supabase)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (req, file, cb) => {
    // Allow common document types
    const allowedMimes = [
      'application/pdf',
      'application/msword',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'image/jpeg',
      'image/png',
      'image/gif',
    ];

    if (allowedMimes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Upload document
router.post('/upload', authenticate, upload.single('file'), async (req: AuthRequest, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    const userId = req.user!.id;
    const { projectId, bidId, name, description } = req.body;

    // Verify that either projectId or bidId is provided
    if (!projectId && !bidId) {
      return res.status(400).json({ error: 'Either projectId or bidId is required' });
    }

    // Verify access permissions
    if (projectId) {
      const { data: project } = await supabaseAdmin
        .from('projects')
        .select('manager_id')
        .eq('id', projectId)
        .single();

      if (!project || project.manager_id !== userId) {
        return res.status(403).json({ error: 'Access denied to this project' });
      }
    }

    if (bidId) {
      const { data: bid } = await supabaseAdmin
        .from('bids')
        .select('vendor_id')
        .eq('id', bidId)
        .single();

      if (!bid || bid.vendor_id !== userId) {
        return res.status(403).json({ error: 'Access denied to this bid' });
      }
    }

    // Generate unique filename
    const fileExt = req.file.originalname.split('.').pop();
    const fileName = `${randomUUID()}.${fileExt}`;

    // Determine storage path
    const storagePath = projectId
      ? `${userId}/projects/${projectId}/${fileName}`
      : `${userId}/bids/${bidId}/${fileName}`;

    // Upload to Supabase Storage
    const { data: uploadData, error: uploadError } = await supabaseAdmin
      .storage
      .from('documents')
      .upload(storagePath, req.file.buffer, {
        contentType: req.file.mimetype,
        upsert: false,
      });

    if (uploadError) {
      console.error('Error uploading to Supabase Storage:', uploadError);
      return res.status(500).json({ error: 'Failed to upload file' });
    }

    // Create document record in database
    const documentData: any = {
      name: name || req.file.originalname,
      file_name: fileName,
      file_size: req.file.size,
      mime_type: req.file.mimetype,
      storage_path: storagePath,
      uploaded_by: userId,
    };

    if (description) documentData.description = description;
    if (projectId) documentData.project_id = projectId;
    if (bidId) documentData.bid_id = bidId;

    const { data: document, error: dbError } = await supabaseAdmin
      .from('documents')
      .insert(documentData)
      .select()
      .single();

    if (dbError || !document) {
      console.error('Error creating document record:', dbError);
      // Try to clean up uploaded file
      await supabaseAdmin.storage.from('documents').remove([storagePath]);
      return res.status(500).json({ error: 'Failed to create document record' });
    }

    res.status(201).json(document);
  } catch (error) {
    console.error('Error uploading document:', error);
    res.status(500).json({ error: 'Failed to upload document' });
  }
});

// Get document with signed URL
router.get('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    const { data: document, error } = await supabaseAdmin
      .from('documents')
      .select(`
        *,
        project:projects(id, manager_id),
        bid:bids(id, vendor_id)
      `)
      .eq('id', id)
      .single();

    if (error || !document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Check permissions
    let hasAccess = false;

    if (role === 'ADMIN') {
      hasAccess = true;
    } else if (document.uploaded_by === userId) {
      hasAccess = true;
    } else if (document.project && document.project.manager_id === userId) {
      hasAccess = true;
    } else if (document.bid && document.bid.vendor_id === userId) {
      hasAccess = true;
    }

    if (!hasAccess) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Generate signed URL (valid for 1 hour)
    const { data: signedUrl, error: urlError } = await supabaseAdmin
      .storage
      .from('documents')
      .createSignedUrl(document.storage_path, 3600);

    if (urlError || !signedUrl) {
      console.error('Error generating signed URL:', urlError);
      return res.status(500).json({ error: 'Failed to generate download URL' });
    }

    res.json({
      ...document,
      downloadUrl: signedUrl.signedUrl,
    });
  } catch (error) {
    console.error('Error fetching document:', error);
    res.status(500).json({ error: 'Failed to fetch document' });
  }
});

// Delete document
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const role = req.user!.role;

    const { data: document } = await supabaseAdmin
      .from('documents')
      .select('uploaded_by, storage_path')
      .eq('id', id)
      .single();

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    // Only uploader or admin can delete
    if (document.uploaded_by !== userId && role !== 'ADMIN') {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete from storage
    const { error: storageError } = await supabaseAdmin
      .storage
      .from('documents')
      .remove([document.storage_path]);

    if (storageError) {
      console.error('Error deleting from storage:', storageError);
      // Continue anyway to remove DB record
    }

    // Delete from database
    const { error: dbError } = await supabaseAdmin
      .from('documents')
      .delete()
      .eq('id', id);

    if (dbError) {
      console.error('Error deleting document record:', dbError);
      return res.status(500).json({ error: 'Failed to delete document' });
    }

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
