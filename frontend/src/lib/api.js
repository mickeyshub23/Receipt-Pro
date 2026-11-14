const API = import.meta.env.VITE_API_URL || 'http://localhost:10000';

function headers(token) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

async function parse(res) {
  const body = await res.text();
  if (!body) return null;
  try {
    return JSON.parse(body);
  } catch (e) {
    return { _raw: body };
  }
}

async function request(path, { method = 'GET', body, token } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: headers(token),
    body: body ? JSON.stringify(body) : undefined,
  });
  const data = await parse(res);
  if (!res.ok) {
    const err = new Error((data && data.error && data.error.message) || `Request failed ${res.status}`);
    err.status = res.status;
    err.data = data;
    throw err;
  }
  return data;
}

export const api = {
  getConfig: () => request('/api/config'),
  checkReceipt: (payload, token) => request('/api/receipts/check', { method: 'POST', body: payload, token }),
  initializePayment: (payload, token) => request('/api/payments/initialize', { method: 'POST', body: payload, token }),
  verifyPayment: (reference, token) => request(`/api/payments/verify?reference=${encodeURIComponent(reference)}`, { token }),
  uploadImage: (id, file, token) => {
    const fd = new FormData();
    fd.append('image', file);
    return fetch(`${API}/api/receipts/${id}/image`, {
      method: 'POST',
      headers: token ? { Authorization: `Bearer ${token}` } : {},
      body: fd,
    }).then(async (res) => {
      const data = await parse(res);
      if (!res.ok) {
        const err = new Error((data && data.error && data.error.message) || `Upload failed ${res.status}`);
        err.status = res.status;
        err.data = data;
        throw err;
      }
      return data;
    });
  },
  getReceipts: ({ style, limit = 20, cursor, token }) => {
    const qs = new URLSearchParams();
    if (style) qs.set('style', style);
    qs.set('limit', String(limit));
    if (cursor) qs.set('cursor', cursor);
    return request(`/api/receipts?${qs.toString()}`, { token });
  },
  getPublicReceipt: (slug) => request(`/api/public/receipts/${encodeURIComponent(slug)}`),
};