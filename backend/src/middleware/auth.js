import { createClient } from '@supabase/supabase-js';
import { env } from '../config/env.js';

let _anon = null;
function anon() {
  if (!_anon) {
    _anon = createClient(env.SUPABASE_URL, env.SUPABASE_PUBLISHABLE_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    });
  }
  return _anon;
}

export default function auth(req, res, next) {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Missing auth token.' } });
  }
  anon()
    .auth.getUser(token)
    .then(({ data, error }) => {
      if (error || !data.user) {
        return res.status(401).json({ error: { code: 'UNAUTHORIZED', message: 'Invalid or expired token.' } });
      }
      req.user = data.user;
      next();
    })
    .catch(() => res.status(500).json({ error: { code: 'SERVER_ERROR', message: 'Auth check failed.' } }));
}