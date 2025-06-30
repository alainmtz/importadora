import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Paper, Box, Typography, Select, MenuItem, Table, TableHead, TableRow, TableCell, TableBody,
  Snackbar, Alert, Grid, InputLabel, FormControl
} from '@mui/material';

function InventarioSucursal({ refrescar }) {
  const [sucursales, setSucursales] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [inventario, setInventario] = useState([]);
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    async function fetchSucursales() {
      const { data } = await supabase.from('sucursales').select('*');
      setSucursales(data || []);
    }
    fetchSucursales();
  }, []);

  useEffect(() => {
    async function fetchInventario() {
      if (!sucursalId) {
        setInventario([]);
        return;
      }
      const { data, error } = await supabase
        .from('inventario')
        .select('*, producto:producto_id(*)')
        .eq('sucursal_id', sucursalId);
      if (error) setMensaje('Error al cargar inventario');
      setInventario(data || []);
    }
    fetchInventario();
  }, [sucursalId, refrescar]);

  return (
    <Paper elevation={3} sx={{ p: 4, mb: 4, width: '100%', maxWidth: '100%', mx: 'auto' }}>
      <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>
        Inventario por Sucursal
      </Typography>
      <Box sx={{ mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth>
              <InputLabel>Sucursal</InputLabel>
              <Select
                value={sucursalId}
                label="Sucursal"
                onChange={e => setSucursalId(e.target.value)}
                displayEmpty
                renderValue={selected => {
                  if (!selected) return <span style={{ color: '#aaa' }}>Seleccione Sucursal</span>;
                  const s = sucursales.find(s => s.id === selected);
                  return s ? `${s.nombre} (${s.tipo} - ${s.pais})` : '';
                }}
              >
                <MenuItem value="" disabled>
                  <em>Seleccione una sucursal...</em>
                </MenuItem>
                {sucursales.map(s => (
                  <MenuItem key={s.id} value={s.id}>
                    {s.nombre} ({s.tipo} - {s.pais})
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
      </Box>
      <Box sx={{
        overflowX: 'auto',
        borderRadius: 2,
        boxShadow: 1,
        backgroundColor: '#fafbfc',
        p: 2,
        width: '100%'
      }}>
        <Table size="small" sx={{ minWidth: 600, width: '100%' }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Cantidad</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Última actualización</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventario.map((i) => (
              <TableRow key={i.id} hover>
                <TableCell>{i.producto?.nombre}</TableCell>
                <TableCell>{i.cantidad}</TableCell>
                <TableCell>
                  {i.updated_at ? new Date(i.updated_at).toLocaleString() : '-'}
                </TableCell>
              </TableRow>
            ))}
            {inventario.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} align="center" sx={{ color: '#888' }}>
                  Sin datos
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Box>
      <Snackbar open={!!mensaje} autoHideDuration={3000} onClose={() => setMensaje('')}>
        <Alert onClose={() => setMensaje('')} severity="info" sx={{ width: '100%' }}>
          {mensaje}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

export default InventarioSucursal;