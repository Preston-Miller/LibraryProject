import { useState } from 'react';
import { useAuth } from './hooks/useAuth';
import LoginPage from './pages/LoginPage';
import MainPage from './pages/MainPage';
import { supabase, isSupabaseConfigured } from './lib/supabase';
import './App.css';

const DEV_USER = { id: 'dev-preview', username: 'preview' };

function App() {
  const { user, loading } = useAuth();
  const [devBypass, setDevBypass] = useState(false);

  async function handleLogin({ email, username, password, isSignUp }) {
    if (isSignUp) {
      const { error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { username: username.trim() || email.split('@')[0] } },
      });
      if (error) throw error;
    } else {
      const { error } = await supabase.auth.signInWithPassword({
        email: email.trim().toLowerCase(),
        password,
      });
      if (error) throw error;
    }
  }

  function handleLogout() {
    if (devBypass) {
      setDevBypass(false);
    } else {
      supabase.auth.signOut();
    }
  }

  const currentUser = devBypass ? DEV_USER : user;

  if (loading) {
    return (
      <div className="app-loading">
        <p>Loading…</p>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <LoginPage
        onLogin={handleLogin}
        showDevBypass={!isSupabaseConfigured}
        onDevBypass={() => setDevBypass(true)}
      />
    );
  }

  return <MainPage user={currentUser} onLogout={handleLogout} />;
}

export default App;
