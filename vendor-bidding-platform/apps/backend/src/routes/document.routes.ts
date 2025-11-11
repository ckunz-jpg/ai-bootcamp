import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import multer from 'multer';
import path from 'path';
import fs from 'fs';

const router = Router();
const prisma = new PrismaClient();

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = process.env.UPLOAD_DIR || './uploads';
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB default
  },
  fileFilter: (req, file, cb) => {
    // Allow common document and image types
    const allowedTypes = /jpeg|jpg|png|gif|pdf|doc|docx|xls|xlsx|txt|csv/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);

    if (extname && mimetype) {
      return cb(null, true);
    } else {
      cb(new Error('Invalid file type'));
    }
  },
});

// Upload document
router.post(
  '/upload',
  authenticate,
  upload.single('file'),
  async (req: AuthRequest, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { projectId, bidId } = req.body;
      const userId = req.user!.id;

      // Verify access to project or bid
      if (projectId) {
        const project = await prisma.project.findUnique({
          where: { id: projectId },
        });

        if (!project) {
          return res.status(404).json({ error: 'Project not found' });
        }

        // Check if user is manager or has bid on project
        if (project.managerId !== userId) {
          const bid = await prisma.bid.findFirst({
            where: { projectId, vendorId: userId },
          });

          if (!bid) {
            return res.status(403).json({ error: 'Access denied' });
          }
        }
      }

      if (bidId) {
        const bid = await prisma.bid.findUnique({
          where: { id: bidId },
          include: { project: true },
        });

        if (!bid) {
          return res.status(404).json({ error: 'Bid not found' });
        }

        if (bid.vendorId !== userId && bid.project.managerId !== userId) {
          return res.status(403).json({ error: 'Access denied' });
        }
      }

      const document = await prisma.document.create({
        data: {
          fileName: req.file.originalname,
          fileUrl: `/uploads/${req.file.filename}`,
          fileSize: req.file.size,
          mimeType: req.file.mimetype,
          uploadedBy: userId,
          ...(projectId && { projectId }),
          ...(bidId && { bidId }),
        },
      });

      res.status(201).json(document);
    } catch (error) {
      console.error('Error uploading document:', error);
      res.status(500).json({ error: 'Failed to upload document' });
    }
  }
);

// Get documents for project or bid
router.get('/', authenticate, async (req: AuthRequest, res) => {
  try {
    const { projectId, bidId } = req.query;

    if (!projectId && !bidId) {
      return res.status(400).json({ error: 'projectId or bidId required' });
    }

    const where: any = {};
    if (projectId) where.projectId = projectId;
    if (bidId) where.bidId = bidId;

    const documents = await prisma.document.findMany({
      where,
      orderBy: { createdAt: 'desc' },
    });

    res.json(documents);
  } catch (error) {
    console.error('Error fetching documents:', error);
    res.status(500).json({ error: 'Failed to fetch documents' });
  }
});

// Delete document
router.delete('/:id', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const document = await prisma.document.findUnique({
      where: { id },
    });

    if (!document) {
      return res.status(404).json({ error: 'Document not found' });
    }

    if (document.uploadedBy !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Delete file from filesystem
    const filePath = path.join(
      process.env.UPLOAD_DIR || './uploads',
      path.basename(document.fileUrl)
    );
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }

    await prisma.document.delete({ where: { id } });

    res.json({ message: 'Document deleted successfully' });
  } catch (error) {
    console.error('Error deleting document:', error);
    res.status(500).json({ error: 'Failed to delete document' });
  }
});

export default router;
