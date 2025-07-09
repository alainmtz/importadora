import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Paper, Box, Typography, Select, MenuItem, TextField, Button, Snackbar, Alert, Grid, Table, TableHead, TableRow, TableCell, TableBody, IconButton
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';

function TransferirInventario({ onTransferencia }) {
  const [productos, setProductos] = useState([]);
  const [sucursales, setSucursales] = useState([]);
  const [origenId, setOrigenId] = useState('');
  const [destinoId, setDestinoId] = useState('');
  const [observaciones, setObservaciones] = useState('');
  const [mensaje, setMensaje] = useState('');
  
  // Detalle de productos
  const [detalleProductos, setDetalleProductos] = useState([]);
  const [productoSeleccionado, setProductoSeleccionado] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [precioUnitario, setPrecioUnitario] = useState('');

  useEffect(() => {
    async function fetchData() {
      const { data: prods } = await supabase.from('productos').select('*');
      setProductos(prods || []);
      const { data: sucs } = await supabase.from('sucursales').select('*');
      setSucursales(sucs || []);
    }
    fetchData();
  }, []);

  const agregarProducto = () => {
    if (!productoSeleccionado || cantidad < 1 || !precioUnitario) {
      setMensaje('Complete todos los campos del producto');
      return;
    }

    const producto = productos.find(p => p.id === productoSeleccionado);
    const nuevoProducto = {
      id: Date.now(), // ID temporal para el frontend
      producto_id: productoSeleccionado,
      producto_nombre: producto.nombre,
      cantidad: cantidad,
      precio_unitario: parseFloat(precioUnitario)
    };

    setDetalleProductos([...detalleProductos, nuevoProducto]);
    setProductoSeleccionado('');
    setCantidad(1);
    setPrecioUnitario('');
  };

  const quitarProducto = (index) => {
    setDetalleProductos(detalleProductos.filter((_, i) => i !== index));
  };

  const handleTransferir = async (e) => {
    e.preventDefault();
    setMensaje('');
    
    if (!origenId || !destinoId || origenId === destinoId || detalleProductos.length === 0) {
      setMensaje('Complete todos los campos correctamente');
      return;
    }

    // Obtener usuario autenticado
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMensaje('Usuario no autenticado');
      return;
    }

    try {
      // Verificar inventario para todos los productos
      for (const item of detalleProductos) {
        const { data: invOrigen } = await supabase
          .from('inventario')
          .select('*')
          .eq('producto_id', item.producto_id)
          .eq('sucursal_id', origenId);

        if (!invOrigen || invOrigen.length === 0 || invOrigen[0].cantidad < item.cantidad) {
          setMensaje(`Inventario insuficiente para ${item.producto_nombre}`);
          return;
        }
      }

      // Crear cabecera de transferencia
      const { data: transferencia, error: errorCabecera } = await supabase
        .from('transferencias')
        .insert([{
          sucursal_origen_id: origenId,
          sucursal_destino_id: destinoId,
          usuario_id: user.id,
          estado: 'completada',
          observaciones: observaciones || `Transferencia de ${detalleProductos.length} productos`
        }])
        .select()
        .single();

      if (errorCabecera) {
        setMensaje('Error al crear la transferencia');
        return;
      }

      // Crear detalles de transferencia
      const detalles = detalleProductos.map(item => ({
        transferencia_id: transferencia.id,
        producto_id: item.producto_id,
        cantidad: item.cantidad,
        precio_unitario: item.precio_unitario
      }));

      const { error: errorDetalle } = await supabase
        .from('detalle_transferencias')
        .insert(detalles);

      if (errorDetalle) {
        setMensaje('Error al crear los detalles de transferencia');
        return;
      }

      // Actualizar inventario para cada producto
      for (const item of detalleProductos) {
        // Restar en origen
        const { data: invOrigen } = await supabase
          .from('inventario')
          .select('*')
          .eq('producto_id', item.producto_id)
          .eq('sucursal_id', origenId);

        if (invOrigen && invOrigen.length > 0) {
          await supabase
            .from('inventario')
            .update({ cantidad: invOrigen[0].cantidad - item.cantidad })
            .eq('id', invOrigen[0].id);
        }

        // Sumar en destino
        const { data: invDestino } = await supabase
          .from('inventario')
          .select('*')
          .eq('producto_id', item.producto_id)
          .eq('sucursal_id', destinoId);

        if (invDestino && invDestino.length > 0) {
          await supabase
            .from('inventario')
            .update({ cantidad: invDestino[0].cantidad + item.cantidad })
            .eq('id', invDestino[0].id);
        } else {
          await supabase
            .from('inventario')
            .insert([{ producto_id: item.producto_id, sucursal_id: destinoId, cantidad: item.cantidad }]);
        }
      }

      setMensaje('Transferencia realizada correctamente');
      setOrigenId('');
      setDestinoId('');
      setObservaciones('');
      setDetalleProductos([]);
      if (onTransferencia) onTransferencia();

    } catch (error) {
      setMensaje('Error en la transferencia: ' + error.message);
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 3, mb: 3, maxWidth: 800 }}>
      <Typography variant="h6" gutterBottom>Transferir Inventario</Typography>
      
      <Box component="form" onSubmit={handleTransferir} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        {/* Configuración de la transferencia */}
        <Grid container spacing={2}>
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
          <Grid item xs={12}>
            <TextField
              label="Observaciones"
              value={observaciones}
              onChange={e => setObservaciones(e.target.value)}
              fullWidth
              multiline
              rows={2}
            />
          </Grid>
        </Grid>

        {/* Agregar productos */}
        <Box sx={{ border: '1px solid #ddd', p: 2, borderRadius: 1 }}>
          <Typography variant="subtitle2" gutterBottom>Agregar Productos</Typography>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <Select
                value={productoSeleccionado}
                onChange={e => setProductoSeleccionado(e.target.value)}
                displayEmpty
                fullWidth
              >
                <MenuItem value="">Seleccione producto</MenuItem>
                {productos.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={12} sm={2}>
              <TextField
                type="number"
                label="Cantidad"
                min={1}
                value={cantidad}
                onChange={e => setCantidad(Number(e.target.value))}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <TextField
                label="Precio unitario"
                type="number"
                value={precioUnitario}
                onChange={e => setPrecioUnitario(e.target.value)}
                inputProps={{ min: 0, step: "0.01" }}
                fullWidth
              />
            </Grid>
            <Grid item xs={12} sm={3}>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={agregarProducto}
                fullWidth
              >
                Agregar
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Tabla de productos agregados */}
        {detalleProductos.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>Productos a Transferir</Typography>
            <Table size="small">
              <TableHead>
                <TableRow>
                  <TableCell>Producto</TableCell>
                  <TableCell>Cantidad</TableCell>
                  <TableCell>Precio Unitario</TableCell>
                  <TableCell>Total</TableCell>
                  <TableCell>Acciones</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {detalleProductos.map((item, index) => (
                  <TableRow key={item.id}>
                    <TableCell>{item.producto_nombre}</TableCell>
                    <TableCell>{item.cantidad}</TableCell>
                    <TableCell>${item.precio_unitario.toFixed(2)}</TableCell>
                    <TableCell>${(item.cantidad * item.precio_unitario).toFixed(2)}</TableCell>
                    <TableCell>
                      <IconButton size="small" onClick={() => quitarProducto(index)} color="error">
                        <Delete />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Box>
        )}

        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          sx={{ mt: 2 }}
          disabled={detalleProductos.length === 0}
        >
          Transferir ({detalleProductos.length} productos)
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