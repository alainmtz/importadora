import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Paper, Box, Typography, Select, MenuItem, TextField, Button, Snackbar, Alert, Grid, InputLabel, FormControl
} from '@mui/material';

const ESTADOS = [
  { value: 'comprado', label: 'Comprado' },
  { value: 'enviado', label: 'Enviado' },
  { value: 'recibido', label: 'Recibido' },
  { value: 'devuelto', label: 'Devuelto' }
];

function Compras({ onCompraRealizada }) {
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [detalle, setDetalle] = useState([]);
  const [sucursalDestinoId, setSucursalDestinoId] = useState(''); // Cambiado aquí
  const [proveedor, setProveedor] = useState('');
  const [estadoEnvio, setEstadoEnvio] = useState('comprado');
  const [mensaje, setMensaje] = useState('');
  const [loading, setLoading] = useState(false);
  const [comprasSucursal, setComprasSucursal] = useState([]);

  // Para agregar productos a la compra
  const [productoId, setProductoId] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precio, setPrecio] = useState('');

  useEffect(() => {
    async function fetchData() {
      const { data: prods } = await supabase.from('productos').select('*');
      setProductos(prods || []);
      const { data: sucs } = await supabase.from('sucursales').select('*');
      setSucursales(sucs || []);
    }
    fetchData();
  }, []);

  useEffect(() => {
    async function fetchComprasSucursal() {
      if (!sucursalDestinoId) {
        setComprasSucursal([]);
        return;
      }
      const { data } = await supabase
        .from('compras')
        .select('id, proveedor, estado_envio, fecha_compra')
        .eq('sucursal_destino_id', sucursalDestinoId)
        .order('fecha_compra', { ascending: false });
      setComprasSucursal(data || []);
    }
    fetchComprasSucursal();
  }, [sucursalDestinoId, mensaje]); // Se actualiza al cambiar sucursal o registrar compra

  const handleAgregarDetalle = () => {
    if (!productoId || cantidad < 1 || precio === '' || precio < 0) {
      setMensaje('Completa los datos del producto');
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

  const handleRegistrarCompra = async (e) => {
    e.preventDefault();
    setMensaje('');
    if (!sucursalDestinoId || detalle.length === 0) {
      setMensaje('Completa todos los campos y agrega al menos un producto');
      return;
    }
    setLoading(true);

    // Insertar compra
    const { data: compra, error } = await supabase
      .from('compras')
      .insert([{
        sucursal_destino_id: sucursalDestinoId,
        proveedor: proveedor || null,
        estado_envio: estadoEnvio,
        fecha_compra: new Date().toISOString().slice(0, 10) // YYYY-MM-DD
      }])
      .select()
      .single();

    if (error || !compra) {
      setMensaje('Error al registrar la compra');
      setLoading(false);
      return;
    }

    // Insertar detalle
    const detallesInsert = detalle.map(d => ({
      compra_id: compra.id,
      producto_id: d.producto_id,
      cantidad: d.cantidad,
      precio_unitario: d.precio_unitario
    }));
    const { error: errorDetalle } = await supabase
      .from('detalle_compras')
      .insert(detallesInsert);

    if (errorDetalle) {
      setMensaje('Error al registrar el detalle de la compra');
      setLoading(false);
      return;
    }

    // Si la compra es recibida, sumar al inventario
    if (estadoEnvio === 'recibido') {
      for (const d of detalle) {
        const { data: inv } = await supabase
          .from('inventario')
          .select('*')
          .eq('producto_id', d.producto_id)
          .eq('sucursal_id', sucursalDestinoId)
          .single();
        if (inv) {
          await supabase
            .from('inventario')
            .update({ cantidad: inv.cantidad + d.cantidad })
            .eq('id', inv.id);
        } else {
          await supabase
            .from('inventario')
            .insert([{ producto_id: d.producto_id, sucursal_id: sucursalDestinoId, cantidad: d.cantidad }]);
        }
      }
    }

    setMensaje('Compra registrada correctamente');
    setDetalle([]);
    setSucursalDestinoId('');
    setProveedor('');
    setEstadoEnvio('comprado');
    setLoading(false);
    if (onCompraRealizada) onCompraRealizada();
  };

  const handleEstadoChange = async (compraId, nuevoEstado) => {
    const { error } = await supabase
      .from('compras')
      .update({ estado_envio: nuevoEstado })
      .eq('id', compraId);
    if (error) {
      setMensaje('Error al actualizar el estado');
      return;
    }

    // Si el nuevo estado es "recibido", actualizar inventario
    if (nuevoEstado === 'recibido') {
      // Obtener detalles de la compra
      const { data: detalles, error: errorDetalles } = await supabase
        .from('detalle_compras')
        .select('producto_id, cantidad')
        .eq('compra_id', compraId);

      if (!errorDetalles && detalles) {
        for (const d of detalles) {
          // Buscar si ya existe inventario para ese producto y sucursal
          const { data: inv } = await supabase
            .from('inventario')
            .select('*')
            .eq('producto_id', d.producto_id)
            .eq('sucursal_id', sucursalDestinoId)
            .single();
          if (inv) {
            await supabase
              .from('inventario')
              .update({ cantidad: inv.cantidad + d.cantidad })
              .eq('id', inv.id);
          } else {
            await supabase
              .from('inventario')
              .insert([{ producto_id: d.producto_id, sucursal_id: sucursalDestinoId, cantidad: d.cantidad }]);
          }
        }
      }
    }

    setComprasSucursal(prev =>
      prev.map(c => c.id === compraId ? { ...c, estado_envio: nuevoEstado } : c)
    );
    setMensaje('Estado actualizado');
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, maxWidth: 800 }}>
      <Typography variant="h6" gutterBottom>Registrar Compra</Typography>
      <Box component="form" onSubmit={handleRegistrarCompra} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <Grid container spacing={2}>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Sucursal destino</InputLabel>
              <Select
                value={sucursalDestinoId}
                label="Sucursal destino"
                onChange={e => setSucursalDestinoId(e.target.value)}
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
              label="Proveedor"
              value={proveedor}
              onChange={e => setProveedor(e.target.value)}
              fullWidth
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <FormControl fullWidth required>
              <InputLabel>Estado</InputLabel>
              <Select
                value={estadoEnvio}
                label="Estado"
                onChange={e => setEstadoEnvio(e.target.value)}
              >
                {ESTADOS.map(e => (
                  <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>
                ))}
              </Select>
            </FormControl>
          </Grid>
        </Grid>
        <Box sx={{ mt: 2 }}>
          <Typography variant="subtitle1">Agregar productos a la compra</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Producto</InputLabel>
                <Select
                  value={productoId}
                  label="Producto"
                  onChange={e => setProductoId(e.target.value)}
                >
                  <MenuItem value="">Seleccione producto</MenuItem>
                  {productos.map(p => (
                    <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
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
              <Typography variant="subtitle2">Detalle de la compra</Typography>
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
          Registrar compra
        </Button>
      </Box>
      <Snackbar open={!!mensaje} autoHideDuration={3000} onClose={() => setMensaje('')}>
        <Alert onClose={() => setMensaje('')} severity="info" sx={{ width: '100%' }}>
          {mensaje}
        </Alert>
      </Snackbar>
      {comprasSucursal.length > 0 && (
        <Box sx={{ mt: 4 }}>
          <Typography variant="subtitle1">Compras de la sucursal seleccionada</Typography>
          <Box component="table" sx={{ width: '100%', mt: 1, borderCollapse: 'collapse' }}>
            <thead>
              <tr>
                <th style={{ borderBottom: '1px solid #ccc' }}>Fecha</th>
                <th style={{ borderBottom: '1px solid #ccc' }}>Proveedor</th>
                <th style={{ borderBottom: '1px solid #ccc' }}>Estado</th>
              </tr>
            </thead>
            <tbody>
              {comprasSucursal.map((c) => (
                <tr key={c.id}>
                  <td>{c.fecha_compra}</td>
                  <td>{c.proveedor}</td>
                  <td>
                    <Select
                      value={c.estado_envio}
                      size="small"
                      onChange={e => handleEstadoChange(c.id, e.target.value)}
                    >
                      {ESTADOS.map(e => (
                        <MenuItem key={e.value} value={e.value}>{e.label}</MenuItem>
                      ))}
                    </Select>
                  </td>
                </tr>
              ))}
            </tbody>
          </Box>
        </Box>
      )}
    </Paper>
  );
}

export default Compras;