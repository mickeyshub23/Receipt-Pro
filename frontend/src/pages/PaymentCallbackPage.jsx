import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';
import { useAuth } from '../context/AuthContext';

export default function PaymentCallbackPage() {
  const navigate = useNavigate();
  const { session } = useAuth();
  const [params] = useSearchParams();
  const [state, setState] = useState({ verifying: true, error: '', done: false });

  useEffect(() => {
    const reference = params.get('reference');
    if (!reference) {
      setState({ verifying: false, error: 'Missing payment reference.', done: false });
      return;
    }
    (async () => {
      const token = session?.access_token;
      if (!token) {
        setState({ verifying: false, error: 'Missing session token. Please sign in again.', done: false });
        return;
      }
      try {
        const res = await api.verifyPayment(reference, token);
        setState({ verifying: false, error: res?.paid ? '' : 'Payment could not be confirmed. Please try again.', done: Boolean(res?.paid) });
      } catch (e) {
        setState({ verifying: false, error: e?.message || 'Payment could not be confirmed.', done: false });
      }
    })();
  }, [params]);

  if (state.verifying) return <div style={{ padding: 40, textAlign: 'center' }}>Verifying payment…</div>;
  if (!state.done) return <div style={{ padding: 40, textAlign: 'center' }}>{state.error || 'Could not confirm payment.'}</div>;
  return <div style={{ padding: 40, textAlign: 'center' }}>Payment verified. You can now download your receipt.</div>;
}
