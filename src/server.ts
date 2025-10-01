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
    });

    // Initialize Socket.io
    socketService.initialize(server);

    // Graceful shutdown
    process.on('SIGTERM', async () => {
      console.log('SIGTERM received, shutting down gracefully');
      server.close(() => {
        mongoose.connection.close();
        redisClient.quit();
        process.exit(0);
      });
    });

  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
};

startServer();