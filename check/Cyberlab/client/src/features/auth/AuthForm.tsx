import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ApiError } from '../../lib/api';
import { useAuth } from './useAuth';
export function AuthForm({ mode }: { mode: 'login' | 'register' }) {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isRegister = mode === 'register';
  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (isRegister && password !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setIsSubmitting(true);
    try {
      if (isRegister) await register(username, email, password, confirmPassword);
      else await login(email, password);
      navigate(isRegister ? '/login' : '/dashboard');
    } catch (requestError) {
      setError(
        requestError instanceof ApiError
          ? requestError.message
          : 'Unable to complete your request.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }
  return (
    <section className="mx-auto max-w-md rounded-xl border border-cyan-900/70 bg-panel p-8 shadow-2xl shadow-cyan-950/20">
      <p className="font-mono text-sm text-cyber">// SECURE ACCESS</p>
      <h1 className="mt-3 text-3xl font-bold text-white">
        {isRegister ? 'Create your account' : 'Welcome back'}
      </h1>
      <p className="mt-2 text-sm text-slate-400">
        {isRegister
          ? 'Start tracking your local learning progress.'
          : 'Sign in to your local CyberLab account.'}
      </p>
      <form className="mt-7 space-y-5" onSubmit={onSubmit}>
        {isRegister && (
          <label className="block text-sm font-medium text-slate-200">
            Username
            <input
              autoComplete="username"
              type="text"
              required
              minLength={3}
              maxLength={32}
              pattern="[A-Za-z0-9_]+"
              value={username}
              onChange={(event) => setUsername(event.target.value)}
              className="mt-2 w-full rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber"
            />
            <span className="mt-1 block text-xs font-normal text-slate-400">
              3–32 letters, numbers, or underscores.
            </span>
          </label>
        )}
        <label className="block text-sm font-medium text-slate-200">
          Email
          <input
            autoComplete="email"
            type="email"
            required
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber"
          />
        </label>
        <label className="block text-sm font-medium text-slate-200">
          Password
          <input
            autoComplete={isRegister ? 'new-password' : 'current-password'}
            type="password"
            required
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            className="mt-2 w-full rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber"
          />
        </label>
        {isRegister && (
          <>
            <label className="block text-sm font-medium text-slate-200">
              Confirm password
              <input
                autoComplete="new-password"
                type="password"
                required
                value={confirmPassword}
                onChange={(event) => setConfirmPassword(event.target.value)}
                className="mt-2 w-full rounded-md border border-slate-700 bg-ink px-3 py-2 text-white outline-none focus:border-cyber"
              />
            </label>
            <p className="text-xs leading-5 text-slate-400">
              Use at least 12 characters with uppercase, lowercase, number, and symbol.
            </p>
          </>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-md border border-red-900 bg-red-950/50 px-3 py-2 text-sm text-red-200"
          >
            {error}
          </p>
        )}
        <button
          disabled={isSubmitting}
          className="w-full rounded-md bg-cyber px-4 py-2.5 font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? 'Please wait…' : isRegister ? 'Create account' : 'Log in'}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">
        {isRegister ? 'Already have an account?' : 'Need an account?'}{' '}
        <Link className="text-cyber hover:text-cyan-200" to={isRegister ? '/login' : '/register'}>
          {isRegister ? 'Log in' : 'Register'}
        </Link>
      </p>
    </section>
  );
}
