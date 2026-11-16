import { useEffect, useRef, useState } from 'react';
import Header from '../components/Header';
import ItemsEditor from '../components/ItemsEditor';
import PreviewOverlay from '../components/PreviewOverlay';
import PaymentModal from '../components/PaymentModal';
import EmailModal from '../components/EmailModal';
import HistoryWindow from '../components/HistoryWindow';
import { useAuth } from '../context/AuthContext';
import { api } from '../lib/api';
import { getDeviceId } from '../lib/device';
import { captureElement, downloadCanvasPng, canvasToPdf, canvasToJpegBlob } from '../lib/capture';
import { DEFAULT_THEME } from '../lib/themes';

const PUBLIC_SITE = import.meta.env.VITE_PUBLIC_SITE_URL || window.location.origin;
const EMAIL_KEY = 'rp_email';

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

function getSavedEmail() {
  try {
    return window.localStorage.getItem(EMAIL_KEY) || '';
  } catch {
    return '';
  }
}

export default function EditorPage({ style, onHome }) {
  const { session, displayName, signOut, user } = useAuth();
  const token = session?.access_token;
  const deviceId = getDeviceId();
  const [fields, setFields] = useState(() => initialState(style));
  const [items, setItems] = useState([{ q: 1, d: '', p: '', x: '' }]);
  const [theme, setTheme] = useState(DEFAULT_THEME);
  const [showPreview, setShowPreview] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [toast, setToast] = useState('');
  const [publicUrl, setPublicUrl] = useState('');
  const [verifiedReceipt, setVerifiedReceipt] = useState(null);
  const [verifyState, setVerifyState] = useState('idle');
  const [verifyError, setVerifyError] = useState('');
  const [savedEmail, setSavedEmail] = useState(() => getSavedEmail());
  const [emailModalOpen, setEmailModalOpen] = useState(false);
  const [emailPendingKind, setEmailPendingKind] = useState('pdf');
  const [pendingReceiptId, setPendingReceiptId] = useState(null);
  const receiptRef = useRef(null);
  const pendingKind = useRef('pdf');
  const [modal, setModal] = useState({ open: false, amountLabel: '₦100', expiresAt: '', payUrl: '', status: 'idle', error: '' });

  const paid = verifiedReceipt !== null;
  const checking = verifyState === 'checking';

  useEffect(() => {
    // Clear stale errors and payment state when the receipt style changes,
    // and when the page reloads or the editor mounts with a new style.
    setVerifyState('idle');
    setVerifyError('');
    setToast('');
    setVerifiedReceipt(null);
    setPendingReceiptId(null);
    setModal((m) => ({ ...m, open: false, status: 'idle', error: '' }));
    if (style === 2) {
      setFields((f) => ({ ...f, cur: f.cur || '₦' }));
    }
  }, [style]);

  function set(id, value) {
    setFields((f) => ({ ...f, [id]: value }));
  }

  function payload() {
    const base = {
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
    if (savedEmail) base.email = savedEmail;
    return base;
  }

  async function doCaptureAndDeliver(kind, receipt) {
    setToast('Preparing your file…');
    try {
      if (receipt && receipt.slug) {
        setPublicUrl(`${PUBLIC_SITE}/r/${receipt.slug}`);
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
          await api.uploadImage(receipt.id, file, token, deviceId);
        } catch (e) {
          // image upload failure should not stop the download
        }
      }
      setToast('');
    } catch (e) {
      setToast('Could not create the file. Check your internet connection and try again.');
    }
  }

  async function initializePaymentWith(receiptId, email) {
    const init = await api.initializePayment({ receiptId, email }, token, deviceId);
    setModal({
      open: true,
      amountLabel: '₦100',
      expiresAt: init.expires_at,
      payUrl: init.authorization_url,
      status: 'idle',
      error: '',
      email,
    });
    setToast('');
  }

  async function handleDownload(kind) {
    pendingKind.current = kind;

    // Only an explicit server-confirmed paid receipt can be downloaded.
    if (verifiedReceipt) {
      await doCaptureAndDeliver(kind, verifiedReceipt);
      return;
    }
    if (!token) {
      setToast('Please log in again.');
      return;
    }

    setVerifyState('checking');
    setVerifyError('');
    setToast('Saving receipt…');

    try {
      // 1. Save the receipt and get its id (checkReceipt creates or updates the receipt).
      const res = await api.checkReceipt(payload(), token, deviceId);
      setVerifyState('idle');
      setToast('');

      // paid comes ONLY from the server (receipt.status === 'paid'), never from local state.
      if (res && res.paid === true && res.receipt) {
        setVerifiedReceipt(res.receipt);
        await doCaptureAndDeliver(kind, res.receipt);
        return;
      }

      // 2. Guard: if the receipt has no id, stop and show a clear message.
      if (!res || !res.receipt || !res.receipt.id) {
        setVerifyError('Save the receipt first.');
        setToast('Save the receipt first.');
        return;
      }

      // 3. Remember the saved receipt id for the payment route.
      setPendingReceiptId(res.receipt.id);

      // 4. Ask for email if not already saved.
      if (!savedEmail) {
        setEmailPendingKind(kind);
        setEmailModalOpen(true);
        return;
      }

      await initializePaymentWith(res.receipt.id, savedEmail);
    } catch (e) {
      setVerifyState('error');
      setVerifyError('Could not save the receipt before payment.');
      setToast(e.message || 'Could not save the receipt before payment.');
    }
  }

  async function onEmailConfirmed(email) {
    setSavedEmail(email);
    setEmailModalOpen(false);
    pendingKind.current = emailPendingKind;
    try {
      await initializePaymentWith(pendingReceiptId, email);
    } catch (e) {
      setToast(e.message || 'Could not start payment.');
    }
  }

  function changeEmail() {
    setEmailModalOpen(true);
  }

  async function startAgain() {
    try {
      await initializePaymentWith(pendingReceiptId, savedEmail);
    } catch (e) {
      setModal((m) => ({ ...m, status: 'failed', error: e.message }));
    }
  }

  function onRetry() {
    setVerifyState('idle');
    setVerifyError('');
    handleDownload(pendingKind.current);
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
          paid={paid}
          checking={checking}
          verifyError={verifyError}
          onRetry={onRetry}
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
        email={modal.email}
        onClose={() => setModal((m) => ({ ...m, open: false }))}
        onStartAgain={startAgain}
        onChangeEmail={changeEmail}
      />

      <EmailModal open={emailModalOpen} onConfirm={onEmailConfirmed} onClose={() => setEmailModalOpen(false)} />

      <HistoryWindow open={showHistory} token={token} onClose={() => setShowHistory(false)} />

      {toast ? (
        <div style={{ position: 'fixed', left: 16, right: 16, bottom: 16, background: 'var(--card)', color: 'var(--text)', padding: '10px 14px', borderRadius: 8, textAlign: 'center', zIndex: 40, border: '1px solid var(--border)', boxShadow: '0 4px 24px rgba(0,0,0,.4)' }}>
          {toast}
        </div>
      ) : null}
    </div>
  );
}
