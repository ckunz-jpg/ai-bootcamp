import { Router } from 'express';
import { PrismaClient } from '@prisma/client';
import { authenticate, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { Server } from 'socket.io';

const router = Router();
const prisma = new PrismaClient();

// Get conversations for authenticated user
router.get('/conversations', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get all messages where user is sender or receiver
    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: userId },
          { receiverId: userId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    // Group by conversation partner
    const conversations = new Map();

    messages.forEach((message) => {
      const partnerId = message.senderId === userId ? message.receiverId : message.senderId;

      if (!conversations.has(partnerId)) {
        const partner = message.senderId === userId ? message.receiver : message.sender;
        conversations.set(partnerId, {
          partnerId,
          partner,
          lastMessage: message,
          unreadCount: 0,
        });
      }

      // Count unread messages
      if (message.receiverId === userId && !message.read) {
        const conv = conversations.get(partnerId);
        conv.unreadCount++;
      }
    });

    res.json(Array.from(conversations.values()));
  } catch (error) {
    console.error('Error fetching conversations:', error);
    res.status(500).json({ error: 'Failed to fetch conversations' });
  }
});

// Get messages with a specific user
router.get('/with/:userId', authenticate, async (req: AuthRequest, res) => {
  try {
    const currentUserId = req.user!.id;
    const { userId } = req.params;

    const messages = await prisma.message.findMany({
      where: {
        OR: [
          { senderId: currentUserId, receiverId: userId },
          { senderId: userId, receiverId: currentUserId },
        ],
      },
      include: {
        sender: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          },
        },
        receiver: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            company: true,
          },
        },
        project: {
          select: {
            id: true,
            title: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    // Mark messages as read
    await prisma.message.updateMany({
      where: {
        senderId: userId,
        receiverId: currentUserId,
        read: false,
      },
      data: { read: true },
    });

    res.json(messages);
  } catch (error) {
    console.error('Error fetching messages:', error);
    res.status(500).json({ error: 'Failed to fetch messages' });
  }
});

// Send a message
router.post(
  '/',
  authenticate,
  [
    body('receiverId').isUUID(),
    body('content').trim().notEmpty(),
  ],
  async (req: AuthRequest, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const senderId = req.user!.id;
      const { receiverId, content, projectId } = req.body;

      // Verify receiver exists
      const receiver = await prisma.user.findUnique({
        where: { id: receiverId },
      });

      if (!receiver) {
        return res.status(404).json({ error: 'Receiver not found' });
      }

      const message = await prisma.message.create({
        data: {
          senderId,
          receiverId,
          content,
          ...(projectId && { projectId }),
        },
        include: {
          sender: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
            },
          },
          receiver: {
            select: {
              id: true,
              firstName: true,
              lastName: true,
              company: true,
            },
          },
          project: {
            select: {
              id: true,
              title: true,
            },
          },
        },
      });

      // Create notification
      await prisma.notification.create({
        data: {
          userId: receiverId,
          title: 'New Message',
          message: `${message.sender.firstName} ${message.sender.lastName} sent you a message`,
          type: 'message',
          link: `/messages/${senderId}`,
        },
      });

      // Emit real-time message
      const io: Server = req.app.get('io');
      io.to(`user_${receiverId}`).emit('message', message);
      io.to(`user_${receiverId}`).emit('notification', {
        title: 'New Message',
        message: `${message.sender.firstName} ${message.sender.lastName} sent you a message`,
        type: 'message',
        link: `/messages/${senderId}`,
      });

      res.status(201).json(message);
    } catch (error) {
      console.error('Error sending message:', error);
      res.status(500).json({ error: 'Failed to send message' });
    }
  }
);

// Mark message as read
router.patch('/:id/read', authenticate, async (req: AuthRequest, res) => {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const message = await prisma.message.findUnique({
      where: { id },
    });

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.receiverId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const updatedMessage = await prisma.message.update({
      where: { id },
      data: { read: true },
    });

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

export default router;
