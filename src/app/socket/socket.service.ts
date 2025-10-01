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

      if (socket.user) {
        socket.join(`user:${socket.user.id}`);
        
        if (socket.user.role === 'instructor') {
          socket.join('instructors');
        }
      }

      socket.on('join-course', (courseId: string) => {
        socket.join(`course:${courseId}`);
        console.log(`User ${socket.user?.id} joined course: ${courseId}`);
      });

      socket.on('leave-course', (courseId: string) => {
        socket.leave(`course:${courseId}`);
        console.log(`User ${socket.user?.id} left course: ${courseId}`);
      });

      socket.on('course-progress', (data: { courseId: string; progress: number }) => {
        socket.to(`course:${data.courseId}`).emit('user-progress-update', {
          userId: socket.user?.id,
          progress: data.progress
        });
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

  emitToInstructors(event: string, data: any) {
    this.io.to('instructors').emit(event, data);
  }
}

export const socketService = new SocketService();