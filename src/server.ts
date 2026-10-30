import app from './app';
import { env } from './config/env';
import { prisma } from './config/database';

const server = app.listen(env.PORT, () => {
  console.log(`🚀 Government Scheme Management API running on port ${env.PORT} [${env.NODE_ENV}]`);
  console.log(`📑 Swagger Documentation available at: http://localhost:${env.PORT}/api-docs`);
  console.log(`🏥 Health Check at: http://localhost:${env.PORT}/health`);
});

const gracefulShutdown = async (signal: string) => {
  console.log(`Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('HTTP server closed.');
    await prisma.$disconnect();
    console.log('Database connections closed.');
    process.exit(0);
  });

  setTimeout(() => {
    console.error('Forcefully terminating process after 10 seconds.');
    process.exit(1);
  }, 10000);
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
