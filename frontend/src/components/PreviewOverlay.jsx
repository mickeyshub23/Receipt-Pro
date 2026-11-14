import { useEffect } from 'react';
import BusinessReceipt from './BusinessReceipt';
import InvoiceReceipt from './InvoiceReceipt';
import ColorSwatches from './ColorSwatches';

export default function PreviewOverlay({
  style,
  fields,
  theme,
  onTheme,
  paid,
  onClose,
  onDownload,
  receiptRef,
}) {
  useEffect(() => {
    function onKey(e) {
      if (e.key === 'Escape') onClose();
    }
    document.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [onClose]);

  return (
    <div className="pv" role="dialog" aria-modal="true" aria-label="Receipt preview">
      <div className="pvbar">
        <button className="btn alt" type="button" onClick={onClose}>Back to edit</button>
        <b>Receipt preview</b>
      </div>
      <div className="pvbody">
        {style === 1 ? (
          <div className="card">
            <label style={{ marginBottom: 8 }}>Background colour</label>
            <ColorSwatches value={theme} onChange={onTheme} />
          </div>
        ) : (
          <p className="mut">Invoice receipts print on plain paper, so there is no background colour to choose.</p>
        )}
        <div className="stage">
          <div id="receipt" ref={receiptRef} style={{ width: '100%' }}>
            {style === 1 ? <BusinessReceipt fields={fields} theme={theme} /> : <InvoiceReceipt fields={fields} />}
          </div>
        </div>
        {paid ? <p className="mut">&#10003; Payment received for this receipt. You can download it again.</p> : null}
        <div className="dl">
          <button className="btn" type="button" onClick={() => onDownload('pdf')}>Download PDF</button>
          <button className="btn alt" type="button" onClick={() => onDownload('png')}>Download image</button>
        </div>
      </div>
    </div>
  );
}