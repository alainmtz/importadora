import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Paper, Box, Typography, Grid, Card, CardContent, LinearProgress,
  Table, TableHead, TableRow, TableCell, TableBody, Chip, Button
} from '@mui/material';
import {
  TrendingUp, TrendingDown, PendingActions, CheckCircle,
  Cancel, Timeline, LocalShipping, Refresh
} from '@mui/icons-material';

function DashboardTransferencias() {
  const [stats, setStats] = useState({
    total: 0,
    completadas: 0,
    pendientes: 0,
    canceladas: 0,
    transferenciasRecientes: []
  });
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    fetchStats();
    
    // Auto-refresh cada 60 segundos
    const interval = setInterval(fetchStats, 60000);
    return () => clearInterval(interval);
  }, []);

  const fetchStats = async (showRefreshing = false) => {
    if (showRefreshing) {
      setRefreshing(true);
    } else {
      setLoading(true);
    }
    
    try {
      // Obtener todas las transferencias
      const { data: transferencias } = await supabase
        .from('transferencias')
        .select(`
          *,
          sucursal_origen:sucursal_origen_id(nombre),
          sucursal_destino:sucursal_destino_id(nombre)
        `)
        .order('fecha_transferencia', { ascending: false });

      if (transferencias) {
        // Obtener todos los usuarios para mapear IDs a emails
        const { data: usuarios } = await supabase.rpc('get_all_users');
        const usuariosMap = {};
        if (usuarios) {
          usuarios.forEach(u => {
            usuariosMap[u.id] = u.email;
          });
        }

        // Mapear transferencias con emails de usuarios
        const transferenciasConUsuarios = transferencias.map(t => ({
          ...t,
          usuario: { email: usuariosMap[t.usuario_id] || 'Usuario no encontrado' }
        }));

        const total = transferenciasConUsuarios.length;
        const completadas = transferenciasConUsuarios.filter(t => t.estado === 'completada').length;
        const pendientes = transferenciasConUsuarios.filter(t => t.estado === 'pendiente').length;
        const canceladas = transferenciasConUsuarios.filter(t => t.estado === 'cancelada').length;
        const recientes = transferenciasConUsuarios.slice(0, 5); // Últimas 5

        setStats({
          total,
          completadas,
          pendientes,
          canceladas,
          transferenciasRecientes: recientes
        });
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  const handleRefresh = () => {
    fetchStats(true);
  };

  const getPorcentaje = (valor, total) => {
    return total > 0 ? Math.round((valor / total) * 100) : 0;
  };

  const getEstadoColor = (estado) => {
    switch (estado) {
      case 'pendiente': return 'warning';
      case 'completada': return 'success';
      case 'cancelada': return 'error';
      default: return 'default';
    }
  };

  if (loading) {
    return (
      <Box sx={{ p: 3 }}>
        <LinearProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Dashboard de Transferencias
        </Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={handleRefresh}
          disabled={refreshing}
        >
          {refreshing ? 'Actualizando...' : 'Actualizar'}
        </Button>
      </Box>

      {/* Tarjetas de estadísticas */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Total Transferencias
                  </Typography>
                  <Typography variant="h4">
                    {stats.total}
                  </Typography>
                </Box>
                <Timeline color="primary" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Completadas
                  </Typography>
                  <Typography variant="h4" color="success.main">
                    {stats.completadas}
                  </Typography>
                </Box>
                <CheckCircle color="success" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Pendientes
                  </Typography>
                  <Typography variant="h4" color="warning.main">
                    {stats.pendientes}
                  </Typography>
                </Box>
                <PendingActions color="warning" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography color="textSecondary" gutterBottom>
                    Canceladas
                  </Typography>
                  <Typography variant="h4" color="error.main">
                    {stats.canceladas}
                  </Typography>
                </Box>
                <Cancel color="error" sx={{ fontSize: 40 }} />
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Progreso de estados */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Distribución por Estado
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Completadas</Typography>
                <Typography variant="body2">{getPorcentaje(stats.completadas, stats.total)}%</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={getPorcentaje(stats.completadas, stats.total)}
                color="success"
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Pendientes</Typography>
                <Typography variant="body2">{getPorcentaje(stats.pendientes, stats.total)}%</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={getPorcentaje(stats.pendientes, stats.total)}
                color="warning"
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                <Typography variant="body2">Canceladas</Typography>
                <Typography variant="body2">{getPorcentaje(stats.canceladas, stats.total)}%</Typography>
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={getPorcentaje(stats.canceladas, stats.total)}
                color="error"
                sx={{ height: 8, borderRadius: 4 }}
              />
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Métricas Rápidas
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1">Tasa de Completación</Typography>
                <Typography variant="h6" color="success.main">
                  {getPorcentaje(stats.completadas, stats.total)}%
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1">Tasa de Cancelación</Typography>
                <Typography variant="h6" color="error.main">
                  {getPorcentaje(stats.canceladas, stats.total)}%
                </Typography>
              </Box>
              
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <Typography variant="body1">Pendientes por Atender</Typography>
                <Typography variant="h6" color="warning.main">
                  {stats.pendientes}
                </Typography>
              </Box>
            </Box>
          </Paper>
        </Grid>
      </Grid>

      {/* Transferencias recientes */}
      <Paper sx={{ p: 3 }}>
        <Typography variant="h6" gutterBottom>
          Transferencias Recientes
        </Typography>
        
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Fecha</TableCell>
              <TableCell>Origen</TableCell>
              <TableCell>Destino</TableCell>
              <TableCell>Usuario</TableCell>
              <TableCell>Estado</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {stats.transferenciasRecientes.map((t) => (
              <TableRow key={t.id} hover>
                <TableCell>
                  {new Date(t.fecha_transferencia).toLocaleDateString()}
                </TableCell>
                <TableCell>{t.sucursal_origen?.nombre}</TableCell>
                <TableCell>{t.sucursal_destino?.nombre}</TableCell>
                <TableCell>{t.usuario?.email}</TableCell>
                <TableCell>
                  <Chip 
                    label={t.estado} 
                    color={getEstadoColor(t.estado)}
                    size="small"
                  />
                </TableCell>
              </TableRow>
            ))}
            {stats.transferenciasRecientes.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} align="center">
                  No hay transferencias recientes
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Paper>
    </Box>
  );
}

export default DashboardTransferencias; 