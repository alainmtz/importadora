import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Paper, Box, Typography, Grid, Card, CardContent, Button
} from '@mui/material';
import {
  PendingActions, CheckCircle, Cancel, Timeline, Notifications
} from '@mui/icons-material';

function ResumenTransferencias() {
  const [resumen, setResumen] = useState({
    total: 0,
    completadas: 0,
    pendientes: 0,
    canceladas: 0
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchResumen();
    // Refrescar cada 2 minutos
    const interval = setInterval(fetchResumen, 120000);
    return () => clearInterval(interval);
  }, []);

  const fetchResumen = async () => {
    try {
      const { data: transferencias } = await supabase
        .from('transferencias')
        .select('estado');

      if (transferencias) {
        const total = transferencias.length;
        const completadas = transferencias.filter(t => t.estado === 'completada').length;
        const pendientes = transferencias.filter(t => t.estado === 'pendiente').length;
        const canceladas = transferencias.filter(t => t.estado === 'cancelada').length;

        setResumen({
          total,
          completadas,
          pendientes,
          canceladas
        });
      }
    } catch (error) {
      console.error('Error fetching resumen:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Paper sx={{ p: 2, mb: 3 }}>
        <Typography>Cargando resumen...</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 3, mb: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h6">
          Resumen de Transferencias
        </Typography>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Timeline />}
          href="#/transferencias"
        >
          Ver Detalles
        </Button>
      </Box>

      <Grid container spacing={2}>
        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Timeline color="primary" sx={{ fontSize: 30, mb: 1 }} />
              <Typography variant="h6">{resumen.total}</Typography>
              <Typography variant="body2" color="text.secondary">Total</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <CheckCircle color="success" sx={{ fontSize: 30, mb: 1 }} />
              <Typography variant="h6" color="success.main">{resumen.completadas}</Typography>
              <Typography variant="body2" color="text.secondary">Completadas</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <PendingActions color="warning" sx={{ fontSize: 30, mb: 1 }} />
              <Typography variant="h6" color="warning.main">{resumen.pendientes}</Typography>
              <Typography variant="body2" color="text.secondary">Pendientes</Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={6} sm={3}>
          <Card variant="outlined">
            <CardContent sx={{ textAlign: 'center', py: 2 }}>
              <Cancel color="error" sx={{ fontSize: 30, mb: 1 }} />
              <Typography variant="h6" color="error.main">{resumen.canceladas}</Typography>
              <Typography variant="body2" color="text.secondary">Canceladas</Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {resumen.pendientes > 0 && (
        <Box sx={{ mt: 2, p: 2, bgcolor: 'warning.light', borderRadius: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Notifications color="warning" />
            <Typography variant="body2">
              Tienes {resumen.pendientes} transferencia{resumen.pendientes > 1 ? 's' : ''} pendiente{resumen.pendientes > 1 ? 's' : ''} por revisar
            </Typography>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

export default ResumenTransferencias; 