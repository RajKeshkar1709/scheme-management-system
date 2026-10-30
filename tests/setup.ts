import { prisma } from '../src/config/database';

beforeAll(async () => {
  // Test DB connection
  await prisma.$connect();
});

afterAll(async () => {
  await prisma.$disconnect();
});
