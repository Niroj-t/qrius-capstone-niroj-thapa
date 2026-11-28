import dotenv from 'dotenv';

dotenv.config();

export const BASE_URL = process.env.BASE_URL ?? 'http://localhost:3000';

export const TEST_PREFIX = process.env.TEST_PREFIX ?? 'test_niroj_';

export const DB_CONFIG = {
  host: process.env.DB_HOST ?? 'localhost',
  port: Number(process.env.DB_PORT ?? 5432),
  database: process.env.DB_NAME ?? 'dai_hire_me',
  user: process.env.DB_USER ?? 'postgres',
  password: process.env.DB_PASSWORD,
};
