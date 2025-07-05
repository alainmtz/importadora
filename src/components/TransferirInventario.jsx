import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Paper, Box, Typography, Select, MenuItem, TextField, Button, Snackbar, Alert, Grid
} from '@mui/material';

function TransferirInventario({ onTransferencia }) {
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [productoId, setProductoId] = useState('');
  const [origenId, setOrigenId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    async function fetchData() {
      const { data: prods } = await supabase.from('productos').select('*');
      setProductos(prods || []);
      const { data: sucs } = await supabase.from('sucursales').select('*');
      setSucursales(sucs || []);
    }
    fetchData();
  }, []);

  const handleTransferir = async (e) => {
    e.preventDefault();
    setMensaje('');
    if (!productoId || !origenId || !destinoId || origenId === destinoId || cantidad < 1 || !precioUnitario) {
      setMensaje('Complete todos los campos correctamente');
      return;
    }
    // Verificar inventario en origen
    const { data: invOrigen } = await supabase
      .from('inventario')
      .select('*')
      .eq('producto_id', productoId)
      .eq('sucursal_id', origenId)
      .single();

    if (!invOrigen || invOrigen.cantidad < cantidad) {
      setMensaje('Inventario insuficiente en la sucursal origen');
      return;
    }

    // Restar en origen
    const { error: errorOrigen } = await supabase
      .from('inventario')
      .update({ cantidad: invOrigen.cantidad - cantidad })
      .eq('id', invOrigen.id);

    if (errorOrigen) {
      setMensaje('Error al actualizar inventario en origen');
      return;
    }

    // Sumar en destino (crear si no existe)
    const { data: invDestino } = await supabase
      .from('inventario')
      .select('*')
      .eq('producto_id', productoId)
      .eq('sucursal_id', destinoId)
      .single();

    if (invDestino) {
      await supabase
        .from('inventario')
        .update({ cantidad: invDestino.cantidad + cantidad })
        .eq('id', invDestino.id);
    } else {
      await supabase
        .from('inventario')
        .insert([{ producto_id: productoId, sucursal_id: destinoId, cantidad }]);
    }

    // Guardar detalle de transferencia
    const { error } = await supabase
      .from('detalle_transferencias')
      .insert([{
        producto_id: productoId,
        sucursal_origen: origenId,
        sucursal_destino: destinoId,
        cantidad,
        precio_unitario: parseFloat(precioUnitario)
      }]);

    if (error) {
      setMensaje('Error al registrar detalle de transferencia');
      return;
    }

    setMensaje('Transferencia realizada correctamente');
    setProductoId('');
    setOrigenId('');
    setDestinoId('');
    setCantidad(1);
    setPrecioUnitario('');
    if (onTransferencia) onTransferencia();
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, maxWidth: 600 }}>
      <Typography variant="h6" gutterBottom>Transferir Inventario</Typography>
      <Box component="form" onSubmit={handleTransferir} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <Select
              value={productoId}
              onChange={e => setProductoId(e.target.value)}
              displayEmpty
              fullWidth
              required
            >
              <MenuItem value="">Seleccione producto</MenuItem>
              {productos.map(p => (
                <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Select
              value={origenId}
              onChange={e => setOrigenId(e.target.value)}
              displayEmpty
              fullWidth
              required
            >
              <MenuItem value="">Sucursal Origen</MenuItem>
              {sucursales.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.nombre} ({s.tipo} - {s.pais})</MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} sm={6}>
            <Select
              value={destinoId}
              onChange={e => setDestinoId(e.target.value)}
              displayEmpty
              fullWidth
              required
            >
              <MenuItem value="">Sucursal Destino</MenuItem>
              {sucursales.map(s => (
                <MenuItem key={s.id} value={s.id}>{s.nombre} ({s.tipo} - {s.pais})</MenuItem>
              ))}
            </Select>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              type="number"
              label="Cantidad"
              min={1}
              value={cantidad}
              onChange={e => setCantidad(Number(e.target.value))}
              fullWidth
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Precio unitario"
              type="number"
              value={precioUnitario}
              onChange={e => setPrecioUnitario(e.target.value)}
              inputProps={{ min: 0, step: "0.01" }}
              sx={{ width: 120, ml: 2 }}
            />
          </Grid>
        </Grid>
        <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }}>
          Transferir
        </Button>
      </Box>
      <Snackbar open={!!mensaje} autoHideDuration={3000} onClose={() => setMensaje('')}>
        <Alert onClose={() => setMensaje('')} severity="info" sx={{ width: '100%' }}>
          {mensaje}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

export default TransferirInventario;