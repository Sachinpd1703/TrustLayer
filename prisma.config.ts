import 'dotenv/config';
import { defineConfig } from 'prisma/config';

export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'npx tsx prisma/seed.ts',
  },
  datasource: {
    // Migrations / db push must use DIRECT_URL (session mode on port 5432).
    url: process.env['DIRECT_URL'] ?? process.env['DATABASE_URL'],
  },
});
