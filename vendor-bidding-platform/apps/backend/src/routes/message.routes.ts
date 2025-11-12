import { Router } from 'express';
import { supabaseAdmin } from '../lib/supabase';
import { authenticate, AuthRequest } from '../middleware/auth';
import { body, validationResult } from 'express-validator';
import { Server } from 'socket.io';

const router = Router();

// Get conversations for authenticated user
router.get('/conversations', authenticate, async (req: AuthRequest, res) => {
  try {
    const userId = req.user!.id;

    // Get all messages where user is sender or receiver
    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, company),
        receiver:users!messages_receiver_id_fkey(id, first_name, last_name, company),
        project:projects(id, title)
      `)
      .or(`sender_id.eq.${userId},receiver_id.eq.${userId}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching conversations:', error);
      return res.status(500).json({ error: 'Failed to fetch conversations' });
    }

    // Group by conversation partner
    const conversations = new Map();

    messages?.forEach((message: any) => {
      const partnerId = message.sender_id === userId ? message.receiver_id : message.sender_id;

      if (!conversations.has(partnerId)) {
        const partner = message.sender_id === userId ? message.receiver : message.sender;
        conversations.set(partnerId, {
          partnerId,
          partner,
          lastMessage: message,
          unreadCount: 0,
        });
      }

      // Count unread messages
      if (message.receiver_id === userId && !message.read) {
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

    const { data: messages, error } = await supabaseAdmin
      .from('messages')
      .select(`
        *,
        sender:users!messages_sender_id_fkey(id, first_name, last_name, company),
        receiver:users!messages_receiver_id_fkey(id, first_name, last_name, company),
        project:projects(id, title)
      `)
      .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${userId}),and(sender_id.eq.${userId},receiver_id.eq.${currentUserId})`)
      .order('created_at', { ascending: true });

    if (error) {
      console.error('Error fetching messages:', error);
      return res.status(500).json({ error: 'Failed to fetch messages' });
    }

    // Mark messages as read
    await supabaseAdmin
      .from('messages')
      .update({ read: true })
      .eq('sender_id', userId)
      .eq('receiver_id', currentUserId)
      .eq('read', false);

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
      const { data: receiver } = await supabaseAdmin
        .from('users')
        .select('id, first_name, last_name')
        .eq('id', receiverId)
        .single();

      if (!receiver) {
        return res.status(404).json({ error: 'Receiver not found' });
      }

      // Create message
      const messageData: any = {
        sender_id: senderId,
        receiver_id: receiverId,
        content,
      };
      if (projectId) messageData.project_id = projectId;

      const { data: message, error: messageError } = await supabaseAdmin
        .from('messages')
        .insert(messageData)
        .select(`
          *,
          sender:users!messages_sender_id_fkey(id, first_name, last_name, company),
          receiver:users!messages_receiver_id_fkey(id, first_name, last_name, company),
          project:projects(id, title)
        `)
        .single();

      if (messageError || !message) {
        console.error('Error creating message:', messageError);
        return res.status(500).json({ error: 'Failed to send message' });
      }

      // Create notification
      const { data: sender } = await supabaseAdmin
        .from('users')
        .select('first_name, last_name')
        .eq('id', senderId)
        .single();

      await supabaseAdmin
        .from('notifications')
        .insert({
          user_id: receiverId,
          title: 'New Message',
          message: `${sender?.first_name} ${sender?.last_name} sent you a message`,
          type: 'message',
          link: `/messages/${senderId}`,
        });

      // Emit real-time message
      const io: Server = req.app.get('io');
      io.to(`user_${receiverId}`).emit('message', message);
      io.to(`user_${receiverId}`).emit('notification', {
        title: 'New Message',
        message: `${sender?.first_name} ${sender?.last_name} sent you a message`,
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

    const { data: message } = await supabaseAdmin
      .from('messages')
      .select('receiver_id')
      .eq('id', id)
      .single();

    if (!message) {
      return res.status(404).json({ error: 'Message not found' });
    }

    if (message.receiver_id !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const { data: updatedMessage, error } = await supabaseAdmin
      .from('messages')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();

    if (error || !updatedMessage) {
      console.error('Error marking message as read:', error);
      return res.status(500).json({ error: 'Failed to mark message as read' });
    }

    res.json(updatedMessage);
  } catch (error) {
    console.error('Error marking message as read:', error);
    res.status(500).json({ error: 'Failed to mark message as read' });
  }
});

export default router;
