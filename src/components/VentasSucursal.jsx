import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Paper, Box, Typography, Select, MenuItem, TextField, Button, Snackbar, Alert, Grid, InputLabel, FormControl
} from '@mui/material';

function VentasSucursal({ onVentaRealizada }) {
  const [sucursales, setSucursales] = useState([]);
  const [productos, setProductos] = useState([]);
  const [inventario, setInventario] = useState([]);
  const [sucursalId, setSucursalId] = useState('');
  const [detalle, setDetalle] = useState([]);
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);

  // Cliente
  const [cliente, setCliente] = useState({
    nombre: '',
    direccion: '',
    telefono: '',
    identificacion: ''
  });

  // Para agregar productos
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState('');

  useEffect(() => {
    async function fetchData() {
      const { data: sucs } = await supabase.from('sucursales').select('*');
      setSucursales(sucs || []);
      const { data: prods } = await supabase.from('productos').select('*');
      setProductos(prods || []);
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function fetchInventario() {
      if (!sucursalId) {
        setInventario([]);
        return;
      }
      const { data: inv } = await supabase
        .from('inventario')
        .select('*, producto:producto_id(*)')
        .eq('sucursal_id', sucursalId);
      setInventario(inv || []);
    }
    fetchInventario();
  }, [sucursalId]);

  const handleAgregarDetalle = () => {
    if (!productoId || cantidad < 1 || !precio) {
      setMensaje('Completa los datos del producto');
      return;
    }
    // Validar stock
    const inv = inventario.find(i => i.producto_id === productoId);
    if (!inv || inv.cantidad < cantidad) {
      setMensaje('Stock insuficiente en la sucursal');
      return;
    }
    const prod = productos.find(p => p.id === productoId);
    setDetalle([
      ...detalle,
      {
        producto_id: productoId,
        nombre: prod?.nombre || '',
        cantidad,
        precio_unitario: precio
      }
    ]);
    setProductoId('');
    setCantidad(1);
    setPrecio('');
  };

  const handleEliminarDetalle = (idx) => {
    setDetalle(detalle.filter((_, i) => i !== idx));
  };

  const handleRegistrarVenta = async (e) => {
    e.preventDefault();
    setMensaje('');
    if (!sucursalId || detalle.length === 0 || !cliente.nombre || !cliente.identificacion) {
      setMensaje('Completa todos los campos obligatorios y agrega al menos un producto');
      return;
    }
    setLoading(true);
    // Insertar venta
    const clienteObj = { ...cliente };
    const { data: venta, error } = await supabase
      .from('ventas')
      .insert([{
        sucursal_id: sucursalId,
        cliente: JSON.stringify(clienteObj)
      }])
      .select()
      .single();

    if (error || !venta) {
      setMensaje('Error al registrar la venta');
      setLoading(false);
      return;
    }

    // Insertar detalle
    const detallesInsert = detalle.map(d => ({
      venta_id: venta.id,
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario
    }));
    const { error: errorDetalle } = await supabase
      .from('detalle_ventas')
      .insert(detallesInsert);

    if (errorDetalle) {
      setMensaje('Error al registrar el detalle de la venta');
      setLoading(false);
      return;
    }

    // Descontar inventario
    for (const d of detalle) {
      const { data: inv } = await supabase
        .from('inventario')
        .select('*')
        .eq('producto_id', d.producto_id)
        .eq('sucursal_id', sucursalId)
        .single();
      if (inv && inv.cantidad >= d.cantidad) {
        await supabase
          .from('inventario')
          .update({ cantidad: inv.cantidad - d.cantidad })
          .eq('id', inv.id);
      }
    }

    setMensaje('Venta registrada correctamente');
    setDetalle([]);
    setSucursalId('');
    setCliente({
      nombre: '',
      direccion: '',
      telefono: '',
      identificacion: ''
    });
    setLoading(false);
    if (onVentaRealizada) onVentaRealizada();
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, maxWidth: 900 }}>
      <Typography variant="h6" gutterBottom>Registrar Venta</Typography>
      <Box component="form" onSubmit={handleRegistrarVenta} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Sucursal</InputLabel>
              <Select
                value={sucursalId}
                label="Sucursal"
                onChange={e => setSucursalId(e.target.value)}
              >
                <MenuItem value="">Seleccione sucursal</MenuItem>
                {sucursales.map(s => (
                  <MenuItem key={s.id} value={s.id}>{s.nombre} ({s.tipo} - {s.pais})</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Nombre del cliente"
              value={cliente.nombre}
              onChange={e => setCliente({ ...cliente, nombre: e.target.value })}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Identificación"
              value={cliente.identificacion}
              onChange={e => setCliente({ ...cliente, identificacion: e.target.value })}
              required
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              label="Teléfono"
              value={cliente.telefono}
              onChange={e => setCliente({ ...cliente, telefono: e.target.value })}
              fullWidth
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              label="Dirección"
              value={cliente.direccion}
              onChange={e => setCliente({ ...cliente, direccion: e.target.value })}
              fullWidth
            />
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1">Agregar productos a la venta</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Producto</InputLabel>
                <Select
                  value={productoId}
                  label="Producto"
                  onChange={e => setProductoId(e.target.value)}
                  disabled={!sucursalId}
                >
                  <MenuItem value="">Seleccione producto</MenuItem>
                  {inventario.map(i => (
                    <MenuItem key={i.producto_id} value={i.producto_id}>
                      {i.producto?.nombre || productos.find(p => p.id === i.producto_id)?.nombre} (Stock: {i.cantidad})
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                type="number"
                label="Cantidad"
                min={1}
                value={cantidad}
                onChange={e => setCantidad(Number(e.target.value))}
                fullWidth
              />
            </Grid>
            <Grid item xs={6} sm={3}>
              <TextField
                type="number"
                label="Precio unitario"
                min={0}
                value={precio}
                onChange={e => setPrecio(Number(e.target.value))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={2}>
              <Button variant="outlined" onClick={handleAgregarDetalle} fullWidth>
                Agregar
              </Button>
            </Grid>
          </Grid>
          {/* Tabla de detalle */}
          {detalle.length > 0 && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="subtitle2">Detalle de la venta</Typography>
              <Box component="table" sx={{ width: '100%', mt: 1, borderCollapse: 'collapse' }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: '1px solid #ccc' }}>Producto</th>
                    <th style={{ borderBottom: '1px solid #ccc' }}>Cantidad</th>
                    <th style={{ borderBottom: '1px solid #ccc' }}>Precio unitario</th>
                    <th style={{ borderBottom: '1px solid #ccc' }}>Total</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {detalle.map((d, idx) => (
                    <tr key={idx}>
                      <td>{d.nombre}</td>
                      <td>{d.cantidad}</td>
                      <td>{d.precio_unitario}</td>
                      <td>{d.cantidad * d.precio_unitario}</td>
                      <td>
                        <Button color="error" size="small" onClick={() => handleEliminarDetalle(idx)}>
                          Eliminar
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </Box>
            </Box>
          )}
        </Box>
        <Button type="submit" variant="contained" color="primary" sx={{ mt: 2 }} disabled={loading}>
          Registrar venta
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

export default VentasSucursal;