import { supabase } from '../lib/supabase.js';

const API = import.meta.env.VITE_API_URL || 'http://localhost:10000';

function headers({ token, deviceId } = {}) {
  const h = { 'Content-Type': 'application/json' };
  if (token) h.Authorization = `Bearer ${token}`;
  if (deviceId) h['x-device-id'] = deviceId;
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

async function request(path, { method = 'GET', body, token, deviceId } = {}) {
  const res = await fetch(`${API}${path}`, {
    method,
    headers: headers({ token, deviceId }),
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

async function uploadToReceiptsBucket(file, userId) {
  const ext = (file.name.split('.').pop() || 'jpg').toLowerCase();
  const path = `${userId}/${Date.now()}.${ext}`;
  const { data, error } = await supabase.storage.from('receipts').upload(path, file, { upsert: false });
  if (error) throw error;
  const { data: publicData } = supabase.storage.from('receipts').getPublicUrl(data.path);
  return publicData.publicUrl;
}

export const api = {
  getConfig: () => request('/api/config'),
  checkReceipt: (payload, token, deviceId) => request('/api/receipts/check', { method: 'POST', body: payload, token, deviceId }),
  initializePayment: (payload, token, deviceId) => request('/api/payments/initialize', { method: 'POST', body: payload, token, deviceId }),
  verifyPayment: (reference, token) => request(`/api/payments/verify?reference=${encodeURIComponent(reference)}`, { token }),
  uploadImage: (id, file, token, deviceId) => {
    const fd = new FormData();
    fd.append('image', file);
    return fetch(`${API}/api/receipts/${id}/image`, {
      method: 'POST',
      headers: { ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(deviceId ? { 'x-device-id': deviceId } : {}) },
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
  uploadReceiptImage: uploadToReceiptsBucket,
  getReceipts: ({ style, limit = 20, cursor, deviceId }) => {
    const qs = new URLSearchParams();
    if (style) qs.set('style', style);
    qs.set('limit', String(limit));
    if (cursor) qs.set('cursor', cursor);
    return request(`/api/receipts?${qs.toString()}`, { deviceId });
  },
  downloadReceipt: (id, deviceId) => request(`/api/receipts/${encodeURIComponent(id)}/download`, { deviceId }),
  getPublicReceipt: (slug) => request(`/api/public/receipts/${encodeURIComponent(slug)}`),
};
