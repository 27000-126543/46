import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(__dirname, '../../.env') });

function getEnvVar(key: string, defaultValue?: string): string {
  const value = process.env[key];
  if (value === undefined && defaultValue === undefined) {
    throw new Error(`环境变量 ${key} 未设置`);
  }
  return value || defaultValue || '';
}

export const config = {
  DATABASE_URL: getEnvVar('DATABASE_URL', 'postgres://localhost:5432/archaeology_db'),
  JWT_SECRET: getEnvVar('JWT_SECRET', 'dev-secret-key-change-in-production'),
  PORT: parseInt(getEnvVar('PORT', '3001'), 10),
  CLIENT_URL: getEnvVar('CLIENT_URL', 'http://localhost:5173'),
  NODE_ENV: getEnvVar('NODE_ENV', 'development'),
  JWT_EXPIRES_IN: getEnvVar('JWT_EXPIRES_IN', '7d'),
  SALT_ROUNDS: parseInt(getEnvVar('SALT_ROUNDS', '12'), 10),
};

export const isDevelopment = config.NODE_ENV === 'development';
export const isProduction = config.NODE_ENV === 'production';
