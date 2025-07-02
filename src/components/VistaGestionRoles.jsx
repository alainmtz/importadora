import React from 'react';
import { useUserRoles } from '../hooks/useUserRoles';
import GestionRoles from './GestionRoles';
import { Box, Typography, Paper } from '@mui/material';

export default function VistaGestionRoles() {
  const { user, roles, loading } = useUserRoles();

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 8 }}><Typography>Cargando...</Typography></Box>;
  if (!user || user.email !== 'melvinalvin.bello@gmail.com') {
    return (
      <Box sx={{ mt: 8, display: 'flex', justifyContent: 'center' }}>
        <Paper elevation={3} sx={{ p: 4, bgcolor: '#fff3f3', minWidth: 350 }}>
          <Typography color="error" align="center" variant="h6">
            No tienes permiso para ver esta sección.
          </Typography>
        </Paper>
      </Box>
    );
  }

  return (
    <Box sx={{
      mt: 6,
      display: 'flex',
      justifyContent: 'center',
      alignItems: 'flex-start',
      minHeight: '70vh',
      p: { xs: 1, sm: 3 }
    }}>
      <Paper elevation={4} sx={{ p: { xs: 2, sm: 4 }, minWidth: 400, width: '100%', maxWidth: 900 }}>
        <GestionRoles />
      </Paper>
    </Box>
  );
}
