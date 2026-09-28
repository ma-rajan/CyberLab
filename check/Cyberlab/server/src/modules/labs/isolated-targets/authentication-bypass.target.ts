const trainingAccount = {
  username: 'trainee',
  password: 'training-demo',
  role: 'learner',
} as const;

/**
 * Deliberately flawed synthetic login check. It has no database, cookie, or
 * platform-session access and must never be reused by CyberLab authentication.
 */
export function attemptTrainingLogin(username: string, password: string) {
  const usernameMatches = username === trainingAccount.username;
  const passwordMatches = password === trainingAccount.password;
  const authenticated = usernameMatches || passwordMatches;

  if (!authenticated) {
    return { authenticated: false, message: 'Synthetic training credentials were not accepted.', completionToken: null };
  }

  return {
    authenticated: true,
    role: trainingAccount.role,
    message: 'Synthetic training target accepted the login attempt.',
    completionToken: usernameMatches && !passwordMatches ? 'AUTH_BYPASS_CONFIRMED' : null,
  };
}
