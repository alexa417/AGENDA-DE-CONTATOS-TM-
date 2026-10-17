import React, { useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import './index.css';
import './gemini-lavender.css';
import { supabase } from './utils/storage';

function LoginScreen() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function signIn(event: React.FormEvent) {
    event.preventDefault();
    setError('');
    setLoading(true);
    try {
      const { error: authError } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
      if (authError) throw authError;
    } catch (err: any) {
      setError(err.message === 'Invalid login credentials' ? 'Correo o contraseña incorrectos.' : (err.message || 'No fue posible iniciar sesión.'));
    } finally { setLoading(false); }
  }

  return <main style={{minHeight:'100vh',display:'grid',placeItems:'center',padding:24,background:'var(--background,#f5f3ff)'}}>
    <form onSubmit={signIn} style={{width:'100%',maxWidth:420,background:'white',padding:32,borderRadius:20,boxShadow:'0 16px 48px #17132a18',display:'grid',gap:16,color:'#181526'}}>
      <div style={{fontSize:12,fontWeight:800,letterSpacing:2,color:'#7c3aed'}}>TM · CRM</div>
      <h1 style={{fontSize:28,fontWeight:800,margin:0}}>Acceso seguro</h1>
      <p style={{margin:0,color:'#666477',lineHeight:1.5}}>Inicia sesión para consultar la agenda, escanear tarjetas y dar seguimiento a tus contactos.</p>
      <label style={{display:'grid',gap:6,fontSize:14,fontWeight:600}}>Correo electrónico<input autoComplete="username" type="email" required value={email} onChange={e=>setEmail(e.target.value)} style={{padding:12,border:'1px solid #dedbea',borderRadius:10,fontSize:16}} /></label>
      <label style={{display:'grid',gap:6,fontSize:14,fontWeight:600}}>Contraseña<input autoComplete="current-password" type="password" required value={password} onChange={e=>setPassword(e.target.value)} style={{padding:12,border:'1px solid #dedbea',borderRadius:10,fontSize:16}} /></label>
      {error && <p role="alert" style={{margin:0,color:'#b91c1c',fontSize:14}}>{error}</p>}
      <button type="submit" disabled={loading} style={{padding:13,border:0,borderRadius:10,background:'#6d28d9',color:'white',fontWeight:700,fontSize:16,cursor:'pointer',opacity: loading ? 0.7 : 1}}>{loading ? 'Validando acceso…' : 'Entrar al CRM'}</button>
      <p style={{fontSize:12,color:'#77748a',margin:0}}>El acceso se administra mediante Supabase. Si no tienes contraseña, solicita al administrador que habilite tu usuario.</p>
    </form>
  </main>;
}

function Root() {
  const [session, setSession] = useState<any>(null);
  const [checking, setChecking] = useState(true);
  useEffect(() => {
    let active = true;
    supabase.auth.getSession().then(({ data }) => { if (active) { setSession(data.session); setChecking(false); } });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, nextSession) => { setSession(nextSession); setChecking(false); });
    return () => { active = false; listener.subscription.unsubscribe(); };
  }, []);
  if (checking) return <main style={{minHeight:'100vh',display:'grid',placeItems:'center'}}>Verificando sesión segura…</main>;
  if (!session) return <LoginScreen />;
  return <><App /><button onClick={() => supabase.auth.signOut()} style={{position:'fixed',right:12,bottom:12,zIndex:1000,padding:'9px 12px',border:'1px solid #ddd6fe',borderRadius:10,background:'#fff',color:'#4c1d95',fontWeight:700,cursor:'pointer'}}>Cerrar sesión</button></>;
}

createRoot(document.getElementById('root')!).render(<Root />);
