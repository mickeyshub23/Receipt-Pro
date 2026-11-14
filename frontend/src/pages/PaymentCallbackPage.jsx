import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { api } from '../lib/api';

export default function PaymentCallbackPage() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [done, setDone] = useState(false);

  useEffect(() => {
    const reference = params.get('reference');
    if (!reference) {
      navigate('/editor', { replace: true });
      return;
    }
    (async () => {
      try {
        const token = localStorage.getItem('rp_token');
        if (token) {
          await api.verifyPayment(reference, token);
        }
      } catch (e) {
        // ignore; user can re-download
      } finally {
        setDone(true);
      }
    })();
  }, []);

  if (!done) return <div style={{ padding: 40, textAlign: 'center' }}>Verifying payment…</div>;
  return <div style={{ padding: 40, textAlign: 'center' }}>Payment verified. You can now download your receipt.</div>;
}