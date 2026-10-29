import { defineConfig } from 'drizzle-kit';

try {
  process.loadEnvFile();
} catch {
  // No .env file; rely on the environment (CI).
}

export default defineConfig({
  dialect: 'postgresql',
  schema: './src/database/schema/index.ts',
  out: './drizzle',
  dbCredentials: { url: process.env.DATABASE_URL! },
});
