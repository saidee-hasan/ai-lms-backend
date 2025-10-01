import { Server } from 'socket.io';
import { Server as HttpServer } from 'http';
import { authenticateSocket } from './socket.auth';

interface AuthenticatedSocket extends Socket {
  user?: {
    id: string;
    role: string;
  };
}

class SocketService {
  private io: Server;

  initialize(server: HttpServer) {
    this.io = new Server(server, {
      cors: {
        origin: process.env.FRONTEND_URL,
        credentials: true
      }
    });

    this.io.use(authenticateSocket);

    this.io.on('connection', (socket: AuthenticatedSocket) => {
      console.log('User connected:', socket.user?.id);

      // Join user to their personal room
      if (socket.user) {
        socket.join(`user:${socket.user.id}`);
      }

      // Course related events
      socket.on('join-course', (courseId: string) => {
        socket.join(`course:${courseId}`);
      });

      socket.on('leave-course', (courseId: string) => {
        socket.leave(`course:${courseId}`);
      });

      socket.on('disconnect', () => {
        console.log('User disconnected:', socket.user?.id);
      });
    });
  }

  emitToUser(userId: string, event: string, data: any) {
    this.io.to(`user:${userId}`).emit(event, data);
  }

  emitToCourse(courseId: string, event: string, data: any) {
    this.io.to(`course:${courseId}`).emit(event, data);
  }
}

export const socketService = new SocketService();