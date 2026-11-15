import { useEffect, useRef, useState } from 'react';

const PAY_ACCT = '08038303372';
const PAY_BANK = '';
const PAY_NAME = 'Charis Digital Skill Academy';

export default function PaymentModal({ open, amountLabel, expiresAt, payUrl, onClose, onStartAgain, status, error, email, onChangeEmail }) {
  const [left, setLeft] = useState(300);
  const timer = useRef(null);

  useEffect(() => {
    if (!open) return undefined;
    function tick() {
      const s = Math.max(0, Math.ceil((new Date(expiresAt).getTime() - Date.now()) / 1000));
      setLeft(s);
    }
    tick();
    timer.current = setInterval(tick, 500);
    return () => clearInterval(timer.current);
  }, [open, expiresAt]);

  if (!open) return null;

  const expired = left <= 0;
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  function copy() {
    try {
      navigator.clipboard.writeText(PAY_ACCT);
    } catch (e) {
      // ignore
    }
  }

  return (
    <div className="pw" role="dialog" aria-modal="true" aria-label="Complete payment">
      <div className="pbox">
        <div className="phead">
          <b>Complete payment</b>
          <button type="button" className="x" aria-label="Close" onClick={onClose}>&times;</button>
        </div>

        {status === 'verifying' ? (
          <div className="ctr">
            <div className="spin" />
            <b>Confirming your payment&hellip;</b>
            <p className="mut">Please wait, do not close this window.</p>
          </div>
        ) : status === 'failed' ? (
          <div className="ctr">
            <b>{error || 'We could not confirm your payment'}</b>
            <p className="mut">Start again to get a new 5-minute window.</p>
            <button type="button" className="btn" onClick={onStartAgain}>Start again</button>
          </div>
        ) : expired ? (
          <div className="ctr">
            <b>Time expired</b>
            <p className="mut">Start again to get a new 5-minute window.</p>
            <button type="button" className="btn" onClick={onStartAgain}>Start again</button>
          </div>
        ) : (
          <div>
            <p className="mut" style={{ margin: 0 }}>
              Pay exactly <b>{amountLabel}</b> to this account, then continue to Paystack.
            </p>
            <div className="acct">
              {PAY_BANK ? <div>{PAY_BANK}</div> : null}
              <div className="no">
                <span>{PAY_ACCT}</span>
                <button type="button" className="cp" onClick={copy}>Copy</button>
              </div>
              <div>{PAY_NAME}</div>
            </div>

            <div style={{ marginTop: 12, fontSize: 13, color: '#555', fontStyle: 'italic' }}>
              Email: <b>{email || 'not set'}</b>
              <button type="button" onClick={onChangeEmail} style={{ marginLeft: 8, background: 'none', border: 'none', color: '#007bff', textDecoration: 'underline', cursor: 'pointer', padding: 0, fontSize: 'inherit' }}>
                Change
              </button>
            </div>

            <div className="tm">
              <span>Time left to pay</span>
              <b>{mm}:{ss}</b>
            </div>
            <button
              type="button"
              className="btn"
              style={{ width: '100%' }}
              onClick={() => {
                if (payUrl) window.location.href = payUrl;
              }}
            >
              Pay now
            </button>
          </div>
        )}
      </div>
    </div>
  );
}