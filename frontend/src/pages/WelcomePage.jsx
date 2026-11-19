import { useAuth } from '../context/AuthContext';

export default function WelcomePage({ onStart }) {
  const { isSupabaseConfigured } = useAuth();
  return (
    <section className="gate">
      <div className="hover-white-card">
        <div className="gcard">
          <div className="brand">Receipt Pro</div>
          <h1>SIGN IN TO ACCESS OUR FEATURES</h1>
          <p className="mut">Sign in or create an account to start making receipts in a minute.</p>
          <button type="button" className="btn" id="gostart" style={{ width: '100%' }} onClick={onStart}>
            GET STARTED
          </button>
          {!isSupabaseConfigured ? (
            <p className="mut" style={{ marginTop: 12, fontSize: 12 }}>
              Supabase is not configured. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY.
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}