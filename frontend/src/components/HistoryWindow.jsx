import { useEffect, useState, useCallback } from 'react';
import { api } from '../lib/api';

function firstFive(items) {
  const shown = (items || []).slice(0, 5).map((i) => `${i.q} x ${i.d || 'Item'}`).join(', ');
  const extra = (items || []).length > 5 ? ` +${items.length - 5} more` : '';
  return shown + extra;
}

export default function HistoryWindow({ open, token, onClose, refreshKey }) {
  const [filter, setFilter] = useState('all');
  const [list, setList] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [lightbox, setLightbox] = useState(null);

  const load = useCallback(async () => {
    if (!open) return;
    setLoading(true);
    setError('');
    try {
      const style = filter === 'all' ? undefined : filter === '1' ? 'business' : 'invoice';
      const data = await api.getReceipts({ style, limit: 50, token });
      setList(data.receipts || []);
    } catch (e) {
      setError(e.message || 'Could not load history.');
    } finally {
      setLoading(false);
    }
  }, [open, filter, token]);

  useEffect(() => {
    load();
  }, [load, refreshKey]);

  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape' && !lightbox) onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [open, lightbox, onClose]);

  if (!open) return null;

  const nb = list.filter((h) => h.style === 'business').length;
  const ni = list.filter((h) => h.style === 'invoice').length;

  function download(h) {
    const a = document.createElement('a');
    a.download = `receipt-${h.id}.jpg`;
    a.href = h.image_url;
    a.target = '_blank';
    a.rel = 'noopener';
    a.click();
  }

  return (
    <div className="pv" role="dialog" aria-modal="true" aria-label="View History">
      <div className="pvbar">
        <button className="btn alt" type="button" onClick={onClose}>Back</button>
        <b>View History</b>
      </div>
      <div className="pvbody">
        <div className="tabs">
          {[
            ['all', `ALL (${nb + ni})`],
            ['1', `BUSINESS (${nb})`],
            ['2', `INVOICE (${ni})`],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              className="opt"
              data-f={k}
              aria-pressed={filter === k}
              onClick={() => setFilter(k)}
            >
              {label}
            </button>
          ))}
        </div>
        {loading ? <p className="mut">Loading…</p> : null}
        {error ? <p className="err">{error}</p> : null}
        {!loading && !error && list.length === 0 ? (
          <p className="mut">
            {filter === 'all'
              ? 'Nothing here yet. Receipts you pay for will show up here.'
              : filter === '1'
                ? 'No business receipts yet.'
                : 'No invoice receipts yet.'}
          </p>
        ) : null}
        {!loading
          ? list.map((h) => {
              const d = new Date(h.created_at);
              return (
                <div className="hi" key={h.id}>
                  {h.image_url ? (
                    <img src={h.image_url} alt="Receipt" onClick={() => setLightbox(h.image_url)} />
                  ) : (
                    <div className="ph">No image saved</div>
                  )}
                  <div className="hm">
                    <b>{h.store_name}</b>
                    <div style={{ margin: '3px 0' }}>
                      <span className={`tag ${h.style === 'business' ? 'b' : 'i'}`}>
                        {h.style === 'business' ? 'BUSINESS RECEIPT' : 'INVOICE RECEIPT'}
                      </span>
                    </div>
                    <div className="mut" style={{ margin: 0 }}>
                      {d.toLocaleDateString('en-GB')} {d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </div>
                    <div>{firstFive(h.payload && h.payload.items)}</div>
                    <div>
                      Total: {h.currency}
                      {Number(h.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                    </div>
                    <div className="mut" style={{ margin: 0 }}>You paid ₦100</div>
                    {h.image_url ? (
                      <button type="button" className="btn alt" onClick={() => download(h)}>Download image</button>
                    ) : null}
                  </div>
                </div>
              );
            })
          : null}
      </div>
      {lightbox ? (
        <div className="lightbox" onClick={() => setLightbox(null)}>
          <img src={lightbox} alt="Receipt enlarged" />
        </div>
      ) : null}
    </div>
  );
}