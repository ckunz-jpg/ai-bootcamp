import { Server } from 'socket.io';
import jwt from 'jsonwebtoken';

export const setupSocketIO = (io: Server) => {
  // Authentication middleware for Socket.IO
  io.use((socket, next) => {
    const token = socket.handshake.auth.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    try {
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || 'default-secret'
      ) as { id: string; email: string; role: string };

      socket.data.user = decoded;
      next();
    } catch (error) {
      next(new Error('Authentication error'));
    }
  });

  io.on('connection', (socket) => {
    const userId = socket.data.user.id;
    console.log(`User connected: ${userId}`);

    // Join user's personal room for targeted notifications
    socket.join(`user_${userId}`);

    // Handle disconnection
    socket.on('disconnect', () => {
      console.log(`User disconnected: ${userId}`);
    });

    // Join project room
    socket.on('join_project', (projectId: string) => {
      socket.join(`project_${projectId}`);
      console.log(`User ${userId} joined project ${projectId}`);
    });

    // Leave project room
    socket.on('leave_project', (projectId: string) => {
      socket.leave(`project_${projectId}`);
      console.log(`User ${userId} left project ${projectId}`);
    });

    // Typing indicator
    socket.on('typing', (data: { receiverId: string; isTyping: boolean }) => {
      io.to(`user_${data.receiverId}`).emit('user_typing', {
        userId,
        isTyping: data.isTyping,
      });
    });
  });
};

export const notifyUsers = (io: Server, userIds: string[], event: string, data: any) => {
  userIds.forEach((userId) => {
    io.to(`user_${userId}`).emit(event, data);
  });
};
