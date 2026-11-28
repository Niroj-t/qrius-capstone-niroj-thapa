import { TEST_PREFIX } from './env';
import type { Role } from './types';

let counter = 0;

export function uniqueId(): string {
  counter += 1;
  return `${Date.now().toString(36)}${process.pid}${counter}`;
}

export const DEFAULT_PASSWORD = 'Test@123';

export const NON_EXISTENT_ID = 99_999_999;

export interface NewUser {
  full_name: string;
  email: string;
  password: string;
  role: Role;
  company?: string;
  phone?: string;
}

export function makeUser(role: Role = 'jobseeker', overrides: Partial<NewUser> = {}): NewUser {
  const id = uniqueId();
  return {
    full_name: `${TEST_PREFIX}${role}_${id}`,
    email: `${TEST_PREFIX}${role}_${id}@example.com`,
    password: DEFAULT_PASSWORD,
    role,
    ...(role === 'employer' ? { company: `${TEST_PREFIX}Company_${id}` } : {}),
    ...overrides,
  };
}

export interface NewJob {
  title: string;
  company: string;
  location: string;
  job_type: string;
  category: string;
  description: string;
  requirements: string;
  salary_min?: number;
  salary_max?: number;
  status?: string;
  deadline?: string;
  employer_id?: number;
}

export function makeJob(overrides: Partial<NewJob> = {}): NewJob {
  const id = uniqueId();
  return {
    title: `${TEST_PREFIX}QA Engineer ${id}`,
    company: `${TEST_PREFIX}Company`,
    location: 'Kathmandu',
    job_type: 'full-time',
    category: 'Quality Assurance',
    description: 'Test description for an automated job posting.',
    requirements: 'Test requirements for an automated job posting.',
    salary_min: 40000,
    salary_max: 60000,
    ...overrides,
  };
}

export function uniqueCategory(): string {
  return `${TEST_PREFIX}cat_${uniqueId()}`;
}
