import { useState, useEffect } from 'react';
import { THEMES } from '../lib/themes';
import { money } from '../lib/format';
import { qrDataUrl } from '../lib/qr';

export default function BusinessReceipt({ fields, theme }) {
  const [qrUrl, setQrUrl] = useState('');

  useEffect(() => {
    const items = fields.items || [];
    const text = fields.publicUrl
      ? fields.publicUrl
      : [
          fields.bn || 'Store',
          ...items.map((i) => {
            const q = Number(i.q) || 0;
            const p = Number(i.p) || 0;
            const x = Number(i.x) || 0;
            return `${q} ${String(i.d || 'Item').trim().toUpperCase()} ${(q * p * (1 - x / 100)).toFixed(2)}`;
          }),
          `TOTAL ${fields.cur === '$' ? 'USD ' : 'NGN '}${items.reduce((s, i) => s + (Number(i.q) || 0) * (Number(i.p) || 0) * (1 - (Number(i.x) || 0) / 100), 0).toFixed(2)}`,
        ].join('\n');
    const finalText = fields.publicUrl
      ? fields.publicUrl
      : text.length > 420
        ? `${fields.bn || 'Store'}\nTOTAL ${fields.cur === '$' ? 'USD ' : 'NGN '}${items.reduce((s, i) => s + (Number(i.q) || 0) * (Number(i.p) || 0) * (1 - (Number(i.x) || 0) / 100), 0).toFixed(2)}`
        : text;
    qrDataUrl(finalText, '#2a2a2a', '#ffffff', 130).then(setQrUrl);
  }, [fields, theme]);

  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  const t = THEMES[theme];
  const sub = (fields.items || []).reduce((s, i) => s + (Number(i.q) || 0) * (Number(i.p) || 0) * (1 - (Number(i.x) || 0) / 100), 0);
  const tot = sub;
  const v = (id, ph) => {
    const x = fields[id];
    return x && String(x).trim() ? esc(String(x)) : `<span style="opacity:.45">${esc(ph)}</span>`;
  };
  const lg = fields.logo ? `<img src="${esc(fields.logo)}" style="max-width:74px;max-height:74px;object-fit:contain" />` : `<div style="width:70px;height:70px;border:1px dashed ${t.mut};color:${t.mut};display:flex;align-items:center;justify-content:center;font-size:11px;text-align:center">Your<br>logo</div>`;
  const d = fields.date ? new Date(fields.date + 'T00:00') : new Date();
  const dateStr = isNaN(d.getTime()) ? '' : d.toLocaleDateString('en-GB');

  const rows = (fields.items || []).map((r) => {
    const q = Number(r.q) || 0;
    const p = Number(r.p) || 0;
    const x = Number(r.x) || 0;
    const a = q * p * (1 - x / 100);
    return `<tr><td style="padding:7px 8px">${esc(r.d || 'Item')}</td><td style="text-align:center">${q}</td><td style="text-align:right">${money(p)}</td><td style="text-align:center">${x}%</td><td style="text-align:right;padding-right:8px">${money(a)}</td></tr>`;
  }).join('');

  const cur = fields.cur || '₦';
  const customer = `<b>To:</b><br>${esc(fields.cn || 'Customer name')}<br>${esc(fields.ca || 'Customer address')}`;
  const right = `<div style="text-align:right"><b>Status:</b> <span style="color:#3B6D11;font-size:14px;background:${t.panel};padding:0 6px;border-radius:4px">Paid</span><br><b>Receipt No:</b> ${esc(fields.no || 'RP-0001')}<br><b>Date:</b> ${esc(dateStr)}<br><b>Payment:</b> ${esc(fields.pay || '')}</div>`;

  const motto = fields.bm && fields.bm.trim() ? `<div style="text-align:center;font-style:italic;font-size:14px;margin-top:16px">${esc(fields.bm)}</div>` : '';

  const html = `
<div style="width:100%;max-width:440px;margin:auto;padding:22px;font:12px/1.5 Arial,sans-serif;color:${t.ink};background:${t.bg} url('/images/${t.folder}/${t.folder}.jpg') center/cover;border-radius:8px">
  <div style="text-align:center;font-size:26px">Payment Receipt</div>
  <div style="display:flex;flex-direction:column;align-items:center;margin-top:10px">${lg}<div style="text-align:center;line-height:1.7;font-size:13px;margin-top:8px">${v('bn','Business name')}<br>${v('ba','Business address')}<br>${v('bp','Phone')}</div></div>
  <div style="display:flex;justify-content:space-between;margin-top:18px;line-height:1.8"><div>${customer}</div><div style="text-align:right">${right}</div></div>
  <div style="background:${t.panel};margin-top:16px;border-radius:4px;padding:4px 0 10px"><table style="width:100%;border-collapse:collapse"><thead><tr style="color:${t.mut};border-bottom:1px solid ${t.mut}"><td style="padding:8px">Item</td><td style="text-align:center">Qty</td><td style="text-align:right">Unit price</td><td style="text-align:center">Disc.</td><td style="text-align:right;padding-right:8px">Amount</td></tr></thead><tbody>${rows}</tbody></table><table style="width:100%;border-collapse:collapse;margin-top:10px"><tr><td style="padding:3px 8px;text-align:right">SUB-TOTAL</td><td style="text-align:right;width:120px;padding-right:8px">${money(sub)}</td></tr><tr style="font-weight:bold"><td style="padding:3px 8px;text-align:right">TOTAL</td><td style="text-align:right;padding-right:8px">${money(tot)}</td></tr></table></div>
  <div style="display:flex;margin:14px 0 0 auto;width:270px;border:1.5px solid ${t.mut};border-radius:8px;overflow:hidden;background:${t.panel}"><div style="background:${t.accent};color:${t.accentText};padding:8px 18px;font-weight:bold;font-size:15px">PAID</div><div style="flex:1;text-align:right;padding:8px 10px;font-weight:bold;font-size:15px">${money(tot)}</div></div>${motto}<div style="text-align:center;margin-top:16px"><div id="qrbox" style="display:inline-block;background:#fff;padding:8px;border-radius:6px;line-height:0">${qrUrl ? `<img src="${qrUrl}" alt="QR" width="130" height="130" />` : '<div style="width:130px;height:130px;border:1px dashed #ccc"></div>'}</div><div style="font-weight:700;letter-spacing:1px;margin-top:6px;font-size:11px">SCAN TO SEE RECEIPT</div></div></div>`;

  return <div dangerouslySetInnerHTML={{ __html: html }} />;
}