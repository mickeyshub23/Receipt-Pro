export function money(n, fixed) {
  const c = typeof fixed === 'number' ? fixed : (Math.round(Number(n) * 100) % 100 !== 0 ? 2 : 0);
  return Number(n).toLocaleString('en-US', { minimumFractionDigits: c, maximumFractionDigits: 2 });
}

export function fmtDate(value) {
  const d = new Date(value + 'T00:00');
  if (isNaN(d)) return '';
  const n = d.getDate();
  const s = n % 10 === 1 && n !== 11 ? 'st' : n % 10 === 2 && n !== 12 ? 'nd' : n % 10 === 3 && n !== 13 ? 'rd' : 'th';
  return `${n}${s} ${d.toLocaleString('en-GB', { month: 'short' })}, ${d.getFullYear()}`;
}

export function slashDate(value) {
  const d = new Date(value + 'T00:00');
  return isNaN(d) ? '' : d.toLocaleDateString('en-GB');
}

export function currencySymbol(cur) {
  return cur === '$' ? '$' : '₦';
}

function qNumber(v) {
  return Number(v) || 0;
}

export function qrTextFor(storeName, items, currency, style) {
  const cur = currency === '$' ? 'USD ' : 'NGN ';
  const total = items.reduce((sum, i) => {
    const q = qNumber(i.q);
    const p = qNumber(i.p);
    const x = style === 1 ? qNumber(i.x) : 0;
    return sum + q * p * (1 - x / 100);
  }, 0);
  const head = storeName || 'Store';
  const lines = items.map((i) => {
    const q = qNumber(i.q);
    const p = qNumber(i.p);
    const x = style === 1 ? qNumber(i.x) : 0;
    return `${q} ${String(i.d || 'Item').trim().toUpperCase()} ${(q * p * (1 - x / 100)).toFixed(2)}`;
  });
  const full = [head, ...lines, `TOTAL ${cur}${total.toFixed(2)}`].join('\n');
  return full.length > 420 ? [head, `TOTAL ${cur}${total.toFixed(2)}`].join('\n') : full;
}