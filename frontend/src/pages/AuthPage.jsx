import { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function AuthPage({ onLoginReady }) {
  const { signUp, signIn, loading } = useAuth();
  const [mode, setMode] = useState('up'); // 'up' = create account, 'in' = login
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [password2, setPassword2] = useState('');
  const [err, setErr] = useState(null);
  const [needsConfirm, setNeedsConfirm] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setErr(null);
    setNeedsConfirm(false);
    if (!email || email.length < 3) return setErr('Please enter a valid email.');
    if (!password || password.length < 6) return setErr('Password must be at least 6 characters.');
    if (mode === 'up' && password !== password2) return setErr('The two passwords do not match.');
    try {
      if (mode === 'up') {
        const { data } = await signUp({ name, email, password });
        if (!data.session) {
          // Email confirmation required — no session yet
          setNeedsConfirm(true);
          return;
        }
        if (onLoginReady) onLoginReady();
      } else {
        await signIn({ email, password });
      }
    } catch (e) {
      setErr(e.message || 'Auth failed.');
    }
  }

  return (
    <section className="gate">
      <div className="gcard" style={{ textAlign: 'left' }}>
        <div className="brand" style={{ textAlign: 'center' }}>Receipt Pro</div>
        <h2 id="atitle" style={{ textAlign: 'center', margin: '8px 0 14px' }}>
          {mode === 'up' ? 'Create your account' : 'Log in'}
        </h2>
        <div className="tabs">
          <button type="button" className="opt" id="tup" aria-pressed={mode === 'up'} onClick={() => setMode('up')}>
            Create account
          </button>
          <button type="button" className="opt" id="tin" aria-pressed={mode === 'in'} onClick={() => setMode('in')}>
            Log in
          </button>
        </div>
        <form onSubmit={handleSubmit}>
          {mode === 'up' && (
            <>
              <label>Name<input id="an" autoComplete="username" value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" /></label>
            </>
          )}
          <label>Email<input id="ae" type="email" autoComplete={mode === 'up' ? 'username' : 'email'} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" /></label>
          <label>Password<input id="ap" type="password" autoComplete={mode === 'up' ? 'new-password' : 'current-password'} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="At least 6 characters" /></label>
          {mode === 'up' && (
            <label id="ap2w">Re-enter password<input id="ap2" type="password" autoComplete="new-password" value={password2} onChange={(e) => setPassword2(e.target.value)} placeholder="Type the password again" /></label>
          )}
          {needsConfirm ? (
            <p className="mut" style={{ margin: 0 }}>
              Check your email to confirm your account, then tap Log in.
            </p>
          ) : err ? (
            <p id="aerr" className="err" role="alert">{err}</p>
          ) : null}
          <button type="submit" className="btn" id="asub" style={{ width: '100%' }} disabled={loading}>
            {mode === 'up' ? 'Create account' : 'Log in'}
          </button>
        </form>
      </div>
    </section>
  );
}