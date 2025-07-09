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
  const [precios, setPrecios] = useState({}); // { producto_id: precio_unitario }
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
        setPrecios({});
        return;
      }
      const { data, error } = await supabase
        .from('inventario')
        .select('*, producto:producto_id(*)')
        .eq('sucursal_id', sucursalId);
      if (error) setMensaje('Error al cargar inventario');
      setInventario(data || []);

      // Obtener el precio unitario de la última compra para cada producto
      const preciosTemp = {};
      for (const item of data || []) {
        const { data: compras } = await supabase
          .from('detalle_compras')
          .select('precio_unitario, fecha')
          .eq('producto_id', item.producto_id)
          //.eq('sucursal_destino_id', sucursalId)
          .order('fecha', { ascending: false })
          .limit(1);
        preciosTemp[item.producto_id] = compras?.[0]?.precio_unitario || null;
      }
      setPrecios(preciosTemp);
      console.log(preciosTemp);
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
        <Table size="small" sx={{ minWidth: 800, width: '100%' }}>
          <TableHead>
            <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
              <TableCell sx={{ fontWeight: 'bold' }}>Producto</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Código</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Cantidad</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Precio Unitario</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Total</TableCell>
              <TableCell sx={{ fontWeight: 'bold' }}>Última actualización</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {inventario.map((i) => {
              const precio = precios[i.producto_id];
              const total = precio ? i.cantidad * precio : null;
              return (
                <TableRow key={i.id} hover>
                  <TableCell>{i.producto?.nombre}</TableCell>
                  <TableCell>
                    <span style={{ fontFamily: 'monospace', fontWeight: 600 }}>
                      {i.producto?.codigo || '----'}
                    </span>
                  </TableCell>
                  <TableCell>{i.cantidad}</TableCell>
                  <TableCell>{precio ? `$${precio.toFixed(2)}` : '-'}</TableCell>
                  <TableCell>{total ? `$${total.toFixed(2)}` : '-'}</TableCell>
                  <TableCell>
                    {i.updated_at ? new Date(i.updated_at).toLocaleString() : '-'}
                  </TableCell>
                </TableRow>
              );
            })}
            {inventario.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} align="center" sx={{ color: '#888' }}>
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