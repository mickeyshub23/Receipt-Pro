import { useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useNavigate, useParams } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import WelcomePage from './pages/WelcomePage';
import AuthPage from './pages/AuthPage';
import HomePage from './pages/HomePage';
import EditorPage from './pages/EditorPage';
import PublicReceiptPage from './pages/PublicReceiptPage';
import PaymentCallbackPage from './pages/PaymentCallbackPage';
import HistoryWindow from './components/HistoryWindow';
import Header from './components/Header';

function AppShell() {
  const { session, loading, displayName, signOut } = useAuth();
  const [showHistory, setShowHistory] = useState(false);
  const navigate = useNavigate();

  if (loading) return <div style={{ padding: 40, textAlign: 'center' }}>Loading…</div>;

  return (
    <>
      <Routes>
        <Route
          path="/"
          element={
            session ? <Navigate to="/app" replace /> : <WelcomePage onStart={() => navigate('/auth')} />
          }
        />
        <Route
          path="/auth"
          element={
            session ? <Navigate to="/app" replace /> : <AuthPage onLoginReady={() => navigate('/app')} />
          }
        />
        <Route
          path="/app"
          element={
            session ? (
              <div>
                <Header name={displayName} onLogout={signOut} />
                <main className="wrap">
                  <HomePage
                    onStyle={(s) => navigate(`/app/editor/${s}`)}
                    onHistory={() => setShowHistory(true)}
                  />
                </main>
                <HistoryWindow open={showHistory} token={session.access_token} onClose={() => setShowHistory(false)} />
              </div>
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/app/editor/:style"
          element={
            session ? <EditorRoute onHome={() => navigate('/app')} /> : <Navigate to="/" replace />
          }
        />
        <Route path="/payment/callback" element={<PaymentCallbackPage />} />
        <Route path="/r/:slug" element={<PublicReceiptPage />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </>
  );
}

function EditorRoute({ onHome }) {
  const { style } = useParams();
  return <EditorPage style={Number(style) || 1} onHome={onHome} />;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppShell />
      </BrowserRouter>
    </AuthProvider>
  );
}