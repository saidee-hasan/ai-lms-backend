import 'dotenv/config';
import mongoose from 'mongoose';
import { app } from './app';
import { env } from './app/config';
import { socketService } from './app/socket/socket.service';
import { redisClient } from './app/config/redis';



const PORT = env.PORT;

const startServer = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');

    // Connect to Redis
    await redisClient.connect();
    console.log('✅ Connected to Redis');

    const server = app.listen(PORT, () => {
      console.log(`🚀 Server running on port ${PORT}`);
      console.log(`📚 Environment: ${env.NODE_ENV}`);
    });

    // Initialize Socket.io
    socketService.initialize(server);

    // Graceful shutdown
    const gracefulShutdown = async () => {
      console.log('🛑 Received shutdown signal, shutting down gracefully...');
      
      server.close(async () => {
        console.log('🔒 HTTP server closed');
        
        await mongoose.connection.close();
        console.log('📦 MongoDB connection closed');
        
        await redisClient.quit();
        console.log('🔴 Redis connection closed');
        
        process.exit(0);
      });

      setTimeout(() => {
        console.error('⏰ Forced shutdown after timeout');
        process.exit(1);
      }, 10000);
    };

    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    process.on('unhandledRejection', (err: Error) => {
      console.error('❌ Unhandled Promise Rejection:', err);
      process.exit(1);
    });

    process.on('uncaughtException', (err: Error) => {
      console.error('❌ Uncaught Exception:', err);
      process.exit(1);
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();