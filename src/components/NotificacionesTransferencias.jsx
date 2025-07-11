import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Badge, IconButton, Dialog, DialogTitle, DialogContent, DialogActions,
  Button, List, ListItem, ListItemText, ListItemSecondaryAction,
  Typography, Box, Chip
} from '@mui/material';
import { Notifications, CheckCircle, Cancel } from '@mui/icons-material';
import { useUserRoles } from '../hooks/useUserRoles';
import { useNavigate } from 'react-router-dom';

function NotificacionesTransferencias() {
  const [transferenciasPendientes, setTransferenciasPendientes] = useState([]);
  const [openDialog, setOpenDialog] = useState(false);
  const [loading, setLoading] = useState(false);
  const { roles, loading: loadingRoles } = useUserRoles();
  const navigate = useNavigate();

  useEffect(() => {
    fetchTransferenciasPendientes();
    // Refrescar cada 30 segundos
    const interval = setInterval(fetchTransferenciasPendientes, 30000);
    return () => clearInterval(interval);
  }, []);

  const fetchTransferenciasPendientes = async () => {
    const { data, error } = await supabase
      .from('transferencias')
      .select(`
        *,
        sucursal_origen:sucursal_origen_id(nombre),
        sucursal_destino:sucursal_destino_id(nombre)
      `)
      .eq('estado', 'pendiente')
      .order('fecha_transferencia', { ascending: false });

    if (!error && data) {
      // Obtener todos los usuarios para mapear IDs a emails
      const { data: usuarios } = await supabase.rpc('get_all_users');
      const usuariosMap = {};
      if (usuarios) {
        usuarios.forEach(u => {
          usuariosMap[u.id] = u.email;
        });
      }

      // Mapear transferencias con emails de usuarios
      const transferenciasConUsuarios = data.map(t => ({
        ...t,
        usuario: { email: usuariosMap[t.usuario_id] || 'Usuario no encontrado' }
      }));

      setTransferenciasPendientes(transferenciasConUsuarios);
    }
  };

  // Redirigir a la pantalla de detalle para aprobar correctamente
  const redirigirAprobar = (transferenciaId) => {
    setOpenDialog(false);
    navigate(`/transferencia/${transferenciaId}`);
  };

  const cantidadPendientes = transferenciasPendientes.length;
  const puedeAprobar = roles && roles.some(role => ['admin', 'developer'].includes(role));

  return (
    <>
      <IconButton
        color="inherit"
        onClick={() => setOpenDialog(true)}
        sx={{ position: 'relative' }}
      >
        <Badge badgeContent={cantidadPendientes} color="error">
          <Notifications />
        </Badge>
      </IconButton>

      <Dialog 
        open={openDialog} 
        onClose={() => setOpenDialog(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Notifications />
            <Typography variant="h6">
              Transferencias Pendientes ({cantidadPendientes})
            </Typography>
          </Box>
        </DialogTitle>
        <DialogContent>
          {cantidadPendientes === 0 ? (
            <Typography variant="body1" sx={{ textAlign: 'center', py: 4 }}>
              No hay transferencias pendientes
            </Typography>
          ) : (
            <List>
              {transferenciasPendientes.map((t) => (
                <ListItem key={t.id} divider>
                  <ListItemText
                    primary={
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <Typography variant="subtitle1">
                          {t.sucursal_origen?.nombre} → {t.sucursal_destino?.nombre}
                        </Typography>
                        <Chip label="Pendiente" color="warning" size="small" />
                      </Box>
                    }
                    secondary={
                      <Box>
                        <Typography variant="body2" color="text.secondary">
                          Fecha: {new Date(t.fecha_transferencia).toLocaleString()}
                        </Typography>
                        <Typography variant="body2" color="text.secondary">
                          Usuario: {t.usuario?.email}
                        </Typography>
                        {t.observaciones && (
                          <Typography variant="body2" color="text.secondary">
                            Observaciones: {t.observaciones}
                          </Typography>
                        )}
                      </Box>
                    }
                  />
                  <ListItemSecondaryAction>
                    {puedeAprobar ? (
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button
                          size="small"
                          variant="outlined"
                          color="success"
                          startIcon={<CheckCircle />}
                          onClick={() => redirigirAprobar(t.id)}
                          disabled={loading}
                        >
                          Aprobar
                        </Button>
                        <Button
                          size="small"
                          variant="outlined"
                          color="error"
                          startIcon={<Cancel />}
                          onClick={() => cambiarEstado(t.id, 'cancelada')}
                          disabled={loading}
                        >
                          Rechazar
                        </Button>
                      </Box>
                    ) : (
                      <Typography variant="body2" color="text.secondary">
                        Sin permisos para aprobar
                      </Typography>
                    )}
                  </ListItemSecondaryAction>
                </ListItem>
              ))}
            </List>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cerrar</Button>
        </DialogActions>
      </Dialog>
    </>
  );
}

export default NotificacionesTransferencias; 