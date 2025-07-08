import React, { useState } from 'react';
import { supabase } from '../supabaseClient';
import { Box, TextField, Button, Typography, Alert } from '@mui/material';

export default function PerfilUsuario({ user, onClose }) {
  const [displayName, setDisplayName] = useState(user.user_metadata?.display_name || '');
  const [email, setEmail] = useState(user.email || '');
  const [phone, setPhone] = useState(user.user_metadata?.phone || '');
  const [mensaje, setMensaje] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleGuardar = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMensaje('');
    setError('');
    // Actualizar user_metadata (display_name, phone)
    const { error: metaError } = await supabase.auth.updateUser({
      data: { display_name: displayName, phone },
    });
    // Actualizar email si cambió
    let emailError = null;
    if (email !== user.email) {
      const { error: eError } = await supabase.auth.updateUser({ email });
      if (eError) emailError = eError.message;
    }
    setLoading(false);
    if (metaError || emailError) {
      setError(metaError?.message || emailError);
    } else {
      setMensaje('Datos actualizados correctamente');
      if (onClose) setTimeout(onClose, 1200);
    }
  };

  return (
    <Box component="form" onSubmit={handleGuardar} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Typography variant="h6">Editar perfil</Typography>
      <TextField
        label="Nombre para mostrar"
        value={displayName}
        onChange={e => setDisplayName(e.target.value)}
        fullWidth
      />
      <TextField
        label="Email"
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        fullWidth
      />
      <TextField
        label="Teléfono"
        value={phone}
        onChange={e => setPhone(e.target.value)}
        fullWidth
      />
      {mensaje && <Alert severity="success">{mensaje}</Alert>}
      {error && <Alert severity="error">{error}</Alert>}
      <Box sx={{ display: 'flex', gap: 2, mt: 1 }}>
        <Button type="submit" variant="contained" disabled={loading}>Guardar</Button>
        <Button onClick={onClose} variant="outlined" color="secondary">Cancelar</Button>
      </Box>
    </Box>
  );
} 