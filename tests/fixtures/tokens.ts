import { createHmac } from 'node:crypto';
import { JWT_SECRET } from './env';
import type { Role } from './types';

export interface TokenClaims {
  id: number;
  email: string;
  role: Role;
}

export interface SignOptions {
  secret?: string;
  expiresInSeconds?: number;
}

function encode(value: object | string): string {
  return Buffer.from(typeof value === 'string' ? value : JSON.stringify(value)).toString('base64url');
}

export function signToken(
  claims: TokenClaims,
  { secret = JWT_SECRET, expiresInSeconds = 3600 }: SignOptions = {},
): string {
  const now = Math.floor(Date.now() / 1000);
  const header = encode({ alg: 'HS256', typ: 'JWT' });
  const payload = encode({ ...claims, iat: now, exp: now + expiresInSeconds });
  const signingSecret = secret ?? JWT_SECRET;
if (!signingSecret) {
  throw new Error('JWT_SECRET must be set to sign tokens');
}
  const signature = createHmac('sha256', signingSecret).update(`${header}.${payload}`).digest('base64url');
  return `${header}.${payload}.${signature}`;
}

export function unsignedToken(claims: TokenClaims): string {
  return `${encode({ alg: 'none', typ: 'JWT' })}.${encode({ ...claims, exp: Math.floor(Date.now() / 1000) + 3600 })}.`;
}

export function withRole(token: string, role: Role): string {
  const [header, payload, signature] = token.split('.');
  const claims = JSON.parse(Buffer.from(payload ?? '', 'base64url').toString()) as Record<string, unknown>;
  return `${header}.${encode({ ...claims, role })}.${signature}`;
}
