export interface SafeUser {
  id: string;
  username: string;
  email: string;
}

export interface AuthenticatedUser extends SafeUser {
  sessionId: string;
}
