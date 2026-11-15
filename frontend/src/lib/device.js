const KEY = 'rp_device_id';

function fallbackId() {
  return `dev-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

export function getDeviceId() {
  if (typeof window === 'undefined') return '';
  let id = window.localStorage.getItem(KEY);
  if (!id) {
    id = typeof window.crypto !== 'undefined' && typeof window.crypto.randomUUID === 'function'
      ? window.crypto.randomUUID()
      : fallbackId();
    try {
      window.localStorage.setItem(KEY, id);
    } catch (e) {}
  }
  return id;
}

export default getDeviceId;
