import React from 'react';
import { Box, Typography, Grid, Paper } from '@mui/material';
import ResumenTransferencias from './ResumenTransferencias';

function PaginaInicio() {
  return (
    <Box sx={{ p: 3 }}>
      <Typography variant="h4" gutterBottom sx={{ mb: 4 }}>
        Bienvenido al Sistema de Inventario
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12}>
          <ResumenTransferencias />
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Accesos Rápidos
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body1">
                • <strong>Productos:</strong> Gestionar catálogo de productos
              </Typography>
              <Typography variant="body1">
                • <strong>Inventario:</strong> Ver stock por sucursal
              </Typography>
              <Typography variant="body1">
                • <strong>Transferencias:</strong> Crear y gestionar transferencias entre sucursales
              </Typography>
              <Typography variant="body1">
                • <strong>Compras:</strong> Registrar nuevas compras
              </Typography>
              <Typography variant="body1">
                • <strong>Ventas:</strong> Registrar ventas por sucursal
              </Typography>
              <Typography variant="body1">
                • <strong>Reportes:</strong> Generar reportes y facturas
              </Typography>
            </Box>
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 3 }}>
            <Typography variant="h6" gutterBottom>
              Notificaciones
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="body2" color="text.secondary">
                • Revisa las notificaciones de transferencias pendientes en la barra superior
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • El indicador de conexión te muestra el estado de internet
              </Typography>
              <Typography variant="body2" color="text.secondary">
                • Puedes personalizar tu perfil haciendo clic en tu nombre
              </Typography>
            </Box>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

export default PaginaInicio; 