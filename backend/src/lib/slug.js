import crypto from 'crypto';

export function makeSlug(length = 24) {
  const bytes = crypto.randomBytes(Math.ceil(length / 2));
  return bytes.toString('base64url').slice(0, length);
}