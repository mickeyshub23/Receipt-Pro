import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import ItemsEditor from '../components/ItemsEditor';
import PreviewOverlay from '../components/PreviewOverlay';
import PaymentModal from '../components/PaymentModal';
import HistoryWindow from '../components/HistoryWindow';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { captureElement, downloadCanvasPng, canvasToPdf, canvasToJpegBlob } from '../lib/capture';
import { DEFAULT_THEME } from '../lib/themes';

const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;

function initialState(style) {
  return {
    bn: '',
    bp: '',
    ba: '',
    bm: '',
    cn: '',
    ca: '',
    no: 'RP-0001',
    date: new Date().toISOString().slice(0, 10),
    pay: 'Cash',
    cur: '₦',
    tn: '',
    tm: '',
    logo: '',
  };
}

export default function EditorPage({ style, onHome }) {
  const { session, displayName, signOut, user } = useAuth();
  const token = session?.access_token;
  const [fields, setFields] = useState(() => initialState(style));
  const [items, setItems] = useState([{ q: 1, d: '', p: '', x: '' }]);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [paidReceipt, setPaidReceipt] = useState(null);
  const receiptRef = useRef(null);
  const pendingKind = useRef('pdf');
  const [modal, setModal] = useState({ open: false, amountLabel: '₦100', expiresAt: '', payUrl: '', status: 'idle', error: '' });

  useEffect(() => {
    if (style === 2) {
      setFields((f) => ({ ...f, cur: f.cur || '₦' }));
    }
  }, [style]);

  function set(id, value) {
    setFields((f) => ({ ...f, [id]: value }));
  }

  function payload() {
    return {
      style,
      theme,
      logo: fields.logo,
      bn: fields.bn,
      bp: fields.bp,
      ba: fields.ba,
      bm: fields.bm,
      cn: fields.cn,
      ca: fields.ca,
      no: fields.no,
      date: fields.date,
      pay: fields.pay,
      cur: fields.cur,
      items: items.map((i) => ({ q: Number(i.q) || 0, d: String(i.d || ''), p: Number(i.p) || 0, x: Number(i.x) || 0 })),
    };
  }

  async function doCaptureAndDeliver(kind, receipt) {
    setToast('Preparing your file…');
    try {
      if (receipt && receipt.slug) {
        setPublicUrl(`${PUBLIC_SITE}/r/${receipt.slug}`);
        // give QR a moment to re-render before capture
        await new Promise((r) => setTimeout(r, 350));
      }
      const canvas = await captureElement(receiptRef.current, 2);
      const base = fields.no ? String(fields.no).replace(/[^\w-]+/g, '_') : 'RP';
      if (kind === 'pdf') canvasToPdf(canvas, `receipt-${base}.pdf`, style);
      else downloadCanvasPng(canvas, `receipt-${base}.png`);

      if (receipt && receipt.id && token) {
        try {
          const blob = await canvasToJpegBlob(canvas, 0.7);
          const file = new File([blob], 'receipt.jpg', { type: 'image/jpeg' });
          await api.uploadImage(receipt.id, file, token);
        } catch (e) {
          // image upload failure should not stop the download
        }
      }
      setPaidReceipt(receipt || paidReceipt);
      setToast('');
    } catch (e) {
      setToast('Could not create the file. Check your internet connection and try again.');
    }
  }

  async function handleDownload(kind) {
    pendingKind.current = kind;
    if (paidReceipt) {
      await doCaptureAndDeliver(kind, paidReceipt);
      return;
    }
    if (!token) {
      setToast('Please log in again.');
      return;
    }
    setToast('Checking payment…');
    try {
      const res = await api.checkReceipt(payload(), token);
      if (res.paid) {
        setToast('');
        await doCaptureAndDeliver(kind, res.receipt);
        return;
      }
      const init = await api.initializePayment(payload(), token);
      setModal({
        open: true,
        amountLabel: '₦100',
        expiresAt: init.expires_at,
        payUrl: init.authorization_url,
        status: 'idle',
        error: '',
      });
      setToast('');
    } catch (e) {
      setToast(e.message || 'Could not start payment.');
    }
  }

  async function startAgain() {
    try {
      const init = await api.initializePayment(payload(), token);
      setModal({
        open: true,
        amountLabel: '₦100',
        expiresAt: init.expires_at,
        payUrl: init.authorization_url,
        status: 'idle',
        error: '',
      });
    } catch (e) {
      setModal((m) => ({ ...m, status: 'failed', error: e.message }));
    }
  }

  return (
    <div>
      <Header name={displayName} onLogout={signOut} />
      <main className="wrap">
        <button type="button" className="btn alt" style={{ marginBottom: 16 }} onClick={onHome}>
          ← Change receipt style
        </button>

        <section className="card">
          <h2>Your business</h2>
          {style === 1 ? (
            <label>
              Logo
              <input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files && e.target.files[0];
                  if (!file) return;
                  const reader = new FileReader();
                  reader.onload = () => set('logo', reader.result);
                  reader.readAsDataURL(file);
                }}
              />
            </label>
          ) : null}
          <div className="g2">
            <label>Business name<input value={fields.bn} onChange={(e) => set('bn', e.target.value)} placeholder="Mama Tee Fabrics" /></label>
            {style === 1 ? <label>Phone<input value={fields.bp} onChange={(e) => set('bp', e.target.value)} placeholder="0801 234 5678" /></label> : null}
          </div>
          {style === 1 ? (
            <>
              <label>Address<input value={fields.ba} onChange={(e) => set('ba', e.target.value)} placeholder="12 Allen Avenue, Ikeja, Lagos" /></label>
              <label>Business motto (optional)<input value={fields.bm} onChange={(e) => set('bm', e.target.value)} placeholder="Quality you can trust" /></label>
            </>
          ) : null}
        </section>

        <section className="card">
          <h2>Receipt details</h2>
          <div className="g2">
            {style === 1 ? (
              <>
                <label>Customer name<input value={fields.cn} onChange={(e) => set('cn', e.target.value)} placeholder="Ada Okafor" /></label>
                <label>Customer address<input value={fields.ca} onChange={(e) => set('ca', e.target.value)} placeholder="5 Admiralty Way, Lekki" /></label>
              </>
            ) : null}
            <label>Receipt number<input value={fields.no} onChange={(e) => set('no', e.target.value)} /></label>
            {style === 1 ? <label>Date<input type="date" value={fields.date} onChange={(e) => set('date', e.target.value)} /></label> : null}
            {style === 1 ? (
              <label>
                Payment method
                <select value={fields.pay} onChange={(e) => set('pay', e.target.value)}>
                  <option>Cash</option>
                  <option>Bank transfer</option>
                  <option>POS (card)</option>
                </select>
              </label>
            ) : null}
            <label>
              Currency
              <select value={fields.cur} onChange={(e) => set('cur', e.target.value)}>
                <option value="₦">₦ Naira</option>
                <option value="$">$ Dollar</option>
              </select>
            </label>
          </div>
        </section>

        <ItemsEditor
          items={items}
          showDiscount={style === 1}
          onAdd={() => setItems((l) => [...l, { q: 1, d: '', p: '', x: '' }])}
          onChange={(i, key, value) => setItems((l) => l.map((it, idx) => (idx === i ? { ...it, [key]: value } : it)))}
          onRemove={(i) => setItems((l) => (l.length > 1 ? l.filter((_, idx) => idx !== i) : l))}
        />

        <button type="button" className="btn" style={{ width: '100%', fontSize: 16, padding: 14 }} onClick={() => setShowPreview(true)}>
          Preview receipt
        </button>
      </main>

      {showPreview ? (
        <PreviewOverlay
          style={style}
          fields={{ ...fields, items, publicUrl }}
          theme={theme}
          onTheme={setTheme}
          paid={Boolean(paidReceipt)}
          onClose={() => setShowPreview(false)}
          onDownload={handleDownload}
          receiptRef={receiptRef}
        />
      ) : null}

      <PaymentModal
        open={modal.open}
        amountLabel={modal.amountLabel}
        expiresAt={modal.expiresAt}
        payUrl={modal.payUrl}
        status={modal.status}
        error={modal.error}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onStartAgain={startAgain}
      />

      <HistoryWindow open={showHistory} token={token} onClose={() => setShowHistory(false)} />

      {toast ? (
        <div style={{ position: 'fixed', left: 16, right: 16, bottom: 16, background: 'var(--ink)', color: '#fff', padding: '10px 14px', borderRadius: 8, textAlign: 'center', zIndex: 40 }}>
          {toast}
        </div>
      ) : null}
    </div>
  );
}