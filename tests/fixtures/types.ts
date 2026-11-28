export type Role = 'admin' | 'employer' | 'jobseeker';

export interface UserDto {
  id: number;
  full_name: string;
  email: string;
  role: Role;
  company?: string | null;
}

export interface AuthResponse {
  message: string;
  user: UserDto;
  token: string;
}

export interface JobDto {
  id: number;
  title: string;
  company: string;
  location: string;
  job_type: string;
  category: string;
  salary_min: number | null;
  salary_max: number | null;
  status: string;
  employer_id: number;
}

export interface JobListResponse {
  jobs: JobDto[];
  total: number;
  page: number;
  limit: number;
}

export interface ApplicationDto {
  id: number;
  job_id: number;
  applicant_id: number;
  status: string;
  cover_letter: string | null;
}

export interface ApplicationListResponse {
  applications?: ApplicationDto[];
  total: number | null;
  page?: number;
  limit?: number;
}

export interface UserListResponse {
  users: UserDto[];
  total: number;
}

export interface StatsResponse {
  open_jobs: number;
  companies: number;
  total_applications: number;
  registered_jobseekers: number;
}

export interface HealthResponse {
  status: string;
  database: string;
}

export interface ErrorResponse {
  error?: string;
}
