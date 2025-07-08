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
    async function checkUserActivoAndSetUser(user) {
      if (!user) {
        setUser(null);
        if (onAuth) onAuth(null);
        return;
      }
      // Consultar si el usuario está activo
      const { data, error } = await supabase
        .from('usuario_roles')
        .select('activo')
        .eq('user_id', user.id)
        .single();
      if (error || !data || data.activo === false) {
        setMensaje('Tu usuario está inactivo. Contacta al administrador.');
        await supabase.auth.signOut();
        setUser(null);
        if (onAuth) onAuth(null);
        return;
      }
      setUser(user);
      if (onAuth) onAuth(user);
    }

    supabase.auth.getUser().then(({ data }) => {
      checkUserActivoAndSetUser(data?.user || null);
    });
    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      checkUserActivoAndSetUser(session?.user || null);
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
    if (error) {
      setMensaje(error.message);
      return;
    }
    // Obtener usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMensaje('No se pudo obtener el usuario.');
      return;
    }
    // Consultar si el usuario está activo en la tabla usuario_roles
    const { data, error: rolesError } = await supabase
      .from('usuario_roles')
      .select('activo')
      .eq('user_id', user.id)
      .single();
    console.log('usuario_roles data:', data);
    console.log('usuario_roles error:', rolesError);
    if (rolesError) {
      setMensaje('Error al verificar el estado del usuario.');
      await supabase.auth.signOut();
      return;
    }
    if (!data || data.activo === false) {
      setMensaje('Tu usuario está inactivo. Contacta al administrador.');
      await supabase.auth.signOut();
      return;
    }
    // Usuario activo, continuar
    if (onAuth) onAuth();
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