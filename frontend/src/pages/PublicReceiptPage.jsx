import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { useParams, useNavigate } from 'react-router-dom';

export default function PublicReceiptPage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [err, setErr] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getPublicReceipt(slug)
      .then(setData)
      .catch((e) => setErr(e.message || 'Receipt not found.'))
      .finally(() => setLoading(false));
  }, [slug]);

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;
  if (err) return <div style={{ padding: 40, textAlign: 'center' }}>Receipt not found.</div>;

  return (
    <section className="public">
      <div className="banner">{data.store_name}</div>
      <img src={data.image_url} alt="Receipt" />
      <a href={data.image_url} download style={{ marginTop: 12, display: 'inline-block', color: 'var(--accent)', fontWeight: 600 }}>Download image</a>
    </section>
  );
}