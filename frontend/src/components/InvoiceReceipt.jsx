import { useState, useEffect } from 'react';
import { money } from '../lib/format';
import { qrDataUrl } from '../lib/qr';

export default function InvoiceReceipt({ fields }) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    const items = fields.items || [];
    const total = items.reduce((s, i) => s + (Number(i.q) || 0) * (Number(i.p) || 0), 0);
    const text = fields.publicUrl
      ? fields.publicUrl
      : [
          fields.bn || 'Store',
          ...items.map((i) => `${Number(i.q) || 0} ${String(i.d || 'Item').trim().toUpperCase()} ${(Number(i.q) || 0) * (Number(i.p) || 0).toFixed(2)}`),
          `TOTAL ${fields.cur === '$' ? 'USD ' : 'NGN '}${total.toFixed(2)}`,
        ].join('\n');
    const finalText = fields.publicUrl ? fields.publicUrl : text.length > 420 ? `${fields.bn || 'Store'}\nTOTAL ${fields.cur === '$' ? 'USD ' : 'NGN '}${total.toFixed(2)}` : text;
    qrDataUrl(finalText, '#2a2a2a', '#ffffff', 130).then(setQrUrl);
  }, [fields]);

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const total = itemsTotal(fields.items);
  const rows = (fields.items || []).map((i) => {
    const q = Number(i.q) || 0;
    const p = Number(i.p) || 0;
    const a = q * p;
    return `<div style="display:flex;gap:10px"><span style="width:14px;text-align:right">${q}</span><span style="flex:1;text-transform:uppercase;word-break:break-word">${esc(i.d || 'Item')}</span><span>${money(a)}</span></div>`;
  }).join('');

  const html = `
<div style="width:100%;max-width:300px;margin:auto;color:#2a2a2a;padding:24px 18px 20px;font-family:'Courier Prime',Courier New,monospace;font-size:12px;line-height:1.6;background:linear-gradient(to bottom,transparent 33%,rgba(0,0,0,.05) 33.3%,transparent 33.8%,transparent 66%,rgba(0,0,0,.05) 66.3%,transparent 66.8%),#f5f2ea">
  <div style="text-align:center;font-family:'Kaushan Script',cursive;font-size:30px;line-height:1.15;margin-bottom:14px;word-break:break-word">${esc(fields.bn || 'Store name')}</div>
  <div style="border-top:1px solid #2a2a2a;margin:10px 0"></div>
  <div style="text-align:center;font-weight:700;letter-spacing:1px;margin-bottom:6px">LIST OF ITEMS BOUGHT</div>${rows}<div style="border-top:1px solid #2a2a2a;margin:10px 0"></div><div style="display:flex;justify-content:space-between;font-weight:700;font-size:13px;margin:3px 0"><span>TOTAL</span><span>${money(total)}</span></div>
  <div id="qrbox" style="display:flex;justify-content:center;margin:16px 0 6px"><div style="width:130px;height:130px;display:flex;align-items:center;justify-content:center;background:#fff">${qrUrl ? `<img src="${qrUrl}" alt="QR" width="120" height="120" style="border:1px solid #ddd" />` : '<div style="width:120px;height:120px;border:1px dashed #ccc"></div>'}</div></div>
  <div style="text-align:center;font-size:11px;font-weight:700;letter-spacing:1px">SCAN TO SEE RECEIPT</div></div>`;

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}

function itemsTotal(items) {
  return (items || []).reduce((s, i) => s + (Number(i.q) || 0) * (Number(i.p) || 0), 0);
}