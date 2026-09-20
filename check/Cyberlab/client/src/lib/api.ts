export interface ApiUser {
  id: string;
  username: string;
  email: string;
}

export type LabCategory =
  | 'WEB_SECURITY'
  | 'AUTHENTICATION'
  | 'ACCESS_CONTROL'
  | 'INJECTION'
  | 'CLIENT_SIDE_SECURITY'
  | 'NETWORK_SECURITY'
  | 'OTHER';
export type LabDifficulty = 'BEGINNER' | 'INTERMEDIATE' | 'ADVANCED';
export type LabProgressStatus = 'NOT_STARTED' | 'IN_PROGRESS' | 'COMPLETED';
export type LabSessionStatus = 'ACTIVE' | 'COMPLETED' | 'EXPIRED';
export interface ApiLab {
  id: string;
  slug: string;
  title: string;
  description: string;
  category: LabCategory;
  difficulty: LabDifficulty;
  estimatedMinutes: number;
  points: number;
  objective: string;
  instructions: string;
  hints: string[];
}
export interface ApiLabSession {
  id: string;
  labId: string;
  startedAt: string;
  lastActivityAt: string;
  completedAt: string | null;
  status: LabSessionStatus;
  lab: ApiLab;
}
export interface ApiLabProgress {
  id: string;
  labId: string;
  status: LabProgressStatus;
  startedAt: string | null;
  completedAt: string | null;
  lab: ApiLab;
}
interface ApiEnvelope<T> {
  data: T;
}
interface ApiErrorEnvelope {
  error: { code: string; message: string };
}
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    public readonly code: string,
    message: string,
  ) {
    super(message);
  }
}
const API_URL = import.meta.env.VITE_API_URL ?? 'http://127.0.0.1:3001';
let csrfToken: string | null = null;
async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: { Accept: 'application/json', ...options.headers },
  });
  const body = (await response.json().catch(() => null)) as
    ApiEnvelope<T> | ApiErrorEnvelope | null;
  if (!response.ok) {
    const error =
      body && 'error' in body ? body.error : { code: 'REQUEST_FAILED', message: 'Request failed.' };
    throw new ApiError(response.status, error.code, error.message);
  }
  if (response.status === 204) return undefined as T;
  return (body as ApiEnvelope<T>).data;
}
async function getCsrfToken() {
  if (!csrfToken) csrfToken = (await request<{ csrfToken: string }>('/api/auth/csrf')).csrfToken;
  return csrfToken;
}
async function authPost<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const token = await getCsrfToken();
  return request<T>(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': token },
    body: JSON.stringify(body),
  });
}
export const api = {
  me: () => request<{ user: ApiUser }>('/api/auth/me'),
  register: (input: { username: string; email: string; password: string; confirmPassword: string }) =>
    authPost<{ user: ApiUser }>('/api/auth/register', input),
  login: (input: { email: string; password: string }) =>
    authPost<{ user: ApiUser }>('/api/auth/login', input),
  logout: async () => {
    await authPost<undefined>('/api/auth/logout', {});
    csrfToken = null;
  },
  labs: () => request<{ labs: ApiLab[] }>('/api/labs'),
  lab: (slug: string) => request<{ lab: ApiLab }>(`/api/labs/${encodeURIComponent(slug)}`),
  labProgress: () => request<{ progress: ApiLabProgress[] }>('/api/labs/progress'),
  startLab: (slug: string) =>
    authPost<{ progress: ApiLabProgress; session: ApiLabSession }>(`/api/labs/${encodeURIComponent(slug)}/start`, {}),
  labSession: (slug: string) => request<{ session: ApiLabSession }>(`/api/labs/${encodeURIComponent(slug)}/session`),
  submitLab: (slug: string, submission: Record<string, unknown>) =>
    authPost<{ success: boolean; completed: boolean; message: string; session: ApiLabSession; progress?: ApiLabProgress }>(
      `/api/labs/${encodeURIComponent(slug)}/submit`, { submission },
    ),
  completeLab: (slug: string) =>
    authPost<{ progress: ApiLabProgress }>(`/api/labs/${encodeURIComponent(slug)}/complete`, {}),
};
