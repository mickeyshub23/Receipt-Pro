import crypto from 'crypto';

function norm(n) {
  const v = Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.round(v * 100) / 100;
}

function logoHash(logo) {
  if (!logo) return '';
  // logo is a data URL; hash its bytes so a different image changes the fingerprint
  const base64 = String(logo).split(',')[1] || String(logo);
  return crypto.createHash('sha256').update(base64, 'base64').digest('hex');
}

export function computeFingerprint(payload) {
  const items = (payload.items || []).map((i) => ({
    q: norm(i.q),
    d: String(i.d || '').trim(),
    p: norm(i.p),
    x: norm(i.x),
  })).sort((a, b) => a.d.localeCompare(b.d));

  const canonical = JSON.stringify({
    bn: String(payload.bn || '').trim(),
    bp: String(payload.bp || '').trim(),
    ba: String(payload.ba || '').trim(),
    bm: String(payload.bm || '').trim(),
    cn: String(payload.cn || '').trim(),
    ca: String(payload.ca || '').trim(),
    no: String(payload.no || '').trim(),
    date: String(payload.date || '').trim(),
    pay: String(payload.pay || '').trim(),
    cur: String(payload.cur || '').trim(),
    items,
    logo: logoHash(payload.logo),
  });

  return crypto.createHash('sha256').update(canonical).digest('hex');
}