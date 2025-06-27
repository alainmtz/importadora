import React, { useState, useEffect } from 'react';
import { supabase } from '../supabaseClient';
import { Button, TextField, Box, Typography, Paper, Snackbar, Alert, Tabs, Tab } from '@mui/material';

function Auth({ onAuth }) {
  const [tab, setTab] = useState(0);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [user, setUser] = useState(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setUser(data?.user || null);
      if (onAuth) onAuth(data?.user || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (onAuth) onAuth(session?.user || null);
    });
    return () => {
      listener?.subscription.unsubscribe();
    };
  }, [onAuth]);

  const handleSignUp = async () => {
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setMensaje(error.message);
    else setMensaje('Revisa tu correo para confirmar el registro');
  };

  const handleSignIn = async () => {
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setMensaje(error.message);
    else if (onAuth) onAuth();
  };

  const handleMagicLink = async () => {
    const { error } = await supabase.auth.signInWithOtp({ email });
    if (error) setMensaje(error.message);
    else setMensaje('Revisa tu correo para el enlace mágico');
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    setMensaje('Sesión cerrada');
  };

  if (user) {
    return (
      <Paper elevation={3} sx={{ p: 3, mb: 3, maxWidth: 400 }}>
        <Typography variant="h6" gutterBottom>Bienvenido, {user.email}</Typography>
        <Button variant="contained" color="secondary" onClick={handleLogout}>
          Cerrar sesión
        </Button>
        <Snackbar open={!!mensaje} autoHideDuration={3000} onClose={() => setMensaje('')}>
          <Alert onClose={() => setMensaje('')} severity="info" sx={{ width: '100%' }}>
            {mensaje}
          </Alert>
        </Snackbar>
      </Paper>
    );
  }

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, maxWidth: 400 }}>
      <Typography variant="h6" gutterBottom>Acceso al sistema</Typography>
      <Tabs value={tab} onChange={(_, v) => setTab(v)} sx={{ mb: 2 }}>
        <Tab label="Login" />
        <Tab label="Registro" />
        <Tab label="Enlace mágico" />
      </Tabs>
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField
          label="Email"
          type="email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          fullWidth
        />
        {(tab === 0 || tab === 1) && (
          <TextField
            label="Contraseña"
            type="password"
            value={password}
            onChange={e => setPassword(e.target.value)}
            fullWidth
          />
        )}
        {tab === 0 && (
          <Button variant="contained" onClick={handleSignIn}>Iniciar sesión</Button>
        )}
        {tab === 1 && (
          <Button variant="contained" onClick={handleSignUp}>Registrarse</Button>
        )}
        {tab === 2 && (
          <Button variant="contained" onClick={handleMagicLink}>Enviar enlace mágico</Button>
        )}
      </Box>
      <Snackbar open={!!mensaje} autoHideDuration={4000} onClose={() => setMensaje('')}>
        <Alert onClose={() => setMensaje('')} severity="info" sx={{ width: '100%' }}>
          {mensaje}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

export default Auth;