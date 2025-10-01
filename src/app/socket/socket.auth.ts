import { Socket } from 'socket.io';
import { verifyToken } from '../utils/jwt';

export const authenticateSocket = (socket: Socket, next: any) => {
  try {
    const token = socket.handshake.auth.token || socket.handshake.headers.token;

    if (!token) {
      return next(new Error('Authentication error'));
    }

    const decoded = verifyToken(token);
    (socket as any).user = decoded;
    next();
  } catch (error) {
    next(new Error('Authentication error'));
  }
};