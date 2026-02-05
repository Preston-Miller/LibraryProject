import { useState } from 'react';
import './LoginPage.css';

/**
 * Login and sign-up on the same screen (project.md §5).
 * Supabase expects a real email for auth, so we use Email + Password.
 * On sign-up we also ask for a display username (stored in profiles).
 */
export default function LoginPage({ onLogin, showDevBypass, onDevBypass }) {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState('');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      if (onLogin) await onLogin({ email, username, password, isSignUp });
    } catch (err) {
      setError(err.message ?? 'Something went wrong');
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>Library Finder</h1>
        <p className="tagline">See who&apos;s at the BYU library and which floor.</p>

        <form onSubmit={handleSubmit}>
          <label htmlFor="email">Email</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="you@example.com"
            required
            autoComplete="email"
          />
          {isSignUp && (
            <>
              <label htmlFor="username">Display name</label>
              <input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="How friends see you (e.g. millerpresto)"
                required={isSignUp}
                autoComplete="username"
              />
            </>
          )}
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Password"
            required
            autoComplete={isSignUp ? 'new-password' : 'current-password'}
          />
          {error && <p className="error">{error}</p>}
          <button type="submit" disabled={loading}>
            {loading ? '…' : isSignUp ? 'Sign up' : 'Sign in'}
          </button>
        </form>

        <p className="toggle-mode">
          {isSignUp ? (
            <>
              Already have an account?{' '}
              <button type="button" className="link" onClick={() => setIsSignUp(false)}>
                Sign in
              </button>
            </>
          ) : (
            <>
              Don&apos;t have an account?{' '}
              <button type="button" className="link" onClick={() => setIsSignUp(true)}>
                Sign up
              </button>
            </>
          )}
        </p>

        {showDevBypass && (
          <p className="dev-bypass">
            <button type="button" className="link" onClick={onDevBypass}>
              Continue without signing in (preview)
            </button>
          </p>
        )}
      </div>
    </div>
  );
}
