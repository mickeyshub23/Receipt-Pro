import { supabase } from '../lib/supabase.js';
import { getDeviceId } from './device.js';

const API = import.meta.env.VITE_API_URL || 'http://localhost:10000';

// Single source of truth for request headers. Every call to the Render API
// must go through this so x-device-id is always sent.
function headers({ token, deviceId, json = true } = {}) {
  const h = {};
  if (json) h['Content-Type'] = 'application/json';
  if (token) h.Authorization = `Bearer ${token}`;
  const id = deviceId || getDeviceId();
  if (id) h['x-device-id'] = id;
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
  verifyPayment: (reference, token, deviceId) => request(`/api/payments/verify?reference=${encodeURIComponent(reference)}`, { token, deviceId }),
  uploadImage: (id, file, token, deviceId) => {
    const fd = new FormData();
    fd.append('image', file);
    return fetch(`${API}/api/receipts/${id}/image`, {
      method: 'POST',
      // FormData needs the browser-set multipart boundary, so no Content-Type.
      headers: headers({ token, deviceId, json: false }),
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
  // Fetch the receipt image as a blob and trigger a browser download.
  downloadReceiptBlob: async (id, deviceId, filename = 'receipt.png') => {
    // First get the signed URL from the backend
    const res = await fetch(`${API}/api/receipts/${encodeURIComponent(id)}/download`, {
      headers: headers({ deviceId, json: true }),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error((data && data.error && data.error.message) || `Download failed ${res.status}`);
    }
    const { url } = await res.json();
    if (!url) throw new Error('No download URL available');

    // Then fetch the actual image and trigger download
    const imageRes = await fetch(url);
    if (!imageRes.ok) throw new Error(`Failed to fetch image: ${imageRes.status}`);
    const blob = await imageRes.blob();
    const blobUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = blobUrl;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(blobUrl);
  },
  getPublicReceipt: (slug) => request(`/api/public/receipts/${encodeURIComponent(slug)}`),
};