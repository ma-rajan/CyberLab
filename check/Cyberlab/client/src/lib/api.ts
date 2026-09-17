export interface ApiUser {
  id: string;
  username: string;
  email: string;
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
async function authPost<T>(path: string, body: Record<string, string>): Promise<T> {
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
};
