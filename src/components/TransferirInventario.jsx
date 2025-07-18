import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Paper, Box, Typography, Select, MenuItem, TextField, Button, Table, TableHead, TableRow, TableCell, TableBody, IconButton, useTheme, useMediaQuery,
  Card, CardContent, CardActions, Grid, Chip, Divider, Snackbar, Alert
} from '@mui/material';
import { Add, Delete } from '@mui/icons-material';
import { QRCodeSVG } from 'qrcode.react';

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

  const [transferenciaCreada, setTransferenciaCreada] = useState(null);
  const [mostrarQR, setMostrarQR] = useState(false);

  // Responsive
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));

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
          estado: 'pendiente',
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

      // Prepara los datos para el QR
      const enlaceQR = `${window.location.origin}/transferencia/${transferencia.id}`;
      setTransferenciaCreada(enlaceQR);
      setMostrarQR(true);
      setMensaje('Transferencia realizada correctamente. Escanea el QR para continuar.');
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
    <Paper elevation={3} sx={{ 
      p: isMobile ? 2 : 3, 
      mb: 3, 
      maxWidth: isMobile ? '100%' : 800,
      mx: 'auto'
    }}>
      <Typography variant={isMobile ? "h6" : "h5"} gutterBottom>
        Transferir Inventario
      </Typography>
      
      <Box component="form" onSubmit={handleTransferir} sx={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 1.5 : 2 }}>
        {/* Configuración de la transferencia */}
        <Grid container spacing={isMobile ? 1 : 2}>
          <Grid item xs={12} sm={6}>
            <Select
              value={origenId}
              onChange={e => setOrigenId(e.target.value)}
              displayEmpty
              fullWidth
              required
              size={isMobile ? "small" : "medium"}
            >
              <MenuItem value="">Sucursal Origen</MenuItem>
              {sucursales.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {isMobile ? `${s.nombre}` : `${s.nombre} (${s.tipo} - ${s.pais})`}
                </MenuItem>
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
              size={isMobile ? "small" : "medium"}
            >
              <MenuItem value="">Sucursal Destino</MenuItem>
              {sucursales.map(s => (
                <MenuItem key={s.id} value={s.id}>
                  {isMobile ? `${s.nombre}` : `${s.nombre} (${s.tipo} - ${s.pais})`}
                </MenuItem>
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
              rows={isMobile ? 2 : 3}
              size={isMobile ? "small" : "medium"}
            />
          </Grid>
        </Grid>

        {/* Agregar productos */}
        <Box sx={{ 
          border: '1px solid #ddd', 
          p: isMobile ? 1.5 : 2, 
          borderRadius: 1 
        }}>
          <Typography variant="subtitle2" gutterBottom>Agregar Productos</Typography>
          <Grid container spacing={isMobile ? 1 : 2} alignItems="center">
            <Grid item xs={12} sm={isMobile ? 12 : 4}>
              <Select
                value={productoSeleccionado}
                onChange={e => setProductoSeleccionado(e.target.value)}
                displayEmpty
                fullWidth
                size={isMobile ? "small" : "medium"}
              >
                <MenuItem value="">Seleccione producto</MenuItem>
                {productos.map(p => (
                  <MenuItem key={p.id} value={p.id}>{p.nombre}</MenuItem>
                ))}
              </Select>
            </Grid>
            <Grid item xs={6} sm={isMobile ? 6 : 2}>
              <TextField
                type="number"
                label="Cantidad"
                min={1}
                value={cantidad}
                onChange={e => setCantidad(Number(e.target.value))}
                fullWidth
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={6} sm={isMobile ? 6 : 3}>
              <TextField
                label="Precio unitario"
                type="number"
                value={precioUnitario}
                onChange={e => setPrecioUnitario(e.target.value)}
                inputProps={{ min: 0, step: "0.01" }}
                fullWidth
                size={isMobile ? "small" : "medium"}
              />
            </Grid>
            <Grid item xs={12} sm={isMobile ? 12 : 3}>
              <Button
                variant="outlined"
                startIcon={<Add />}
                onClick={agregarProducto}
                fullWidth
                size={isMobile ? "large" : "medium"}
              >
                Agregar Producto
              </Button>
            </Grid>
          </Grid>
        </Box>

        {/* Tarjetas de productos agregados */}
        {detalleProductos.length > 0 && (
          <Box>
            <Typography variant="subtitle2" gutterBottom>
              Productos a Transferir ({detalleProductos.length})
            </Typography>
            <Grid container spacing={isMobile ? 1 : 2}>
              {detalleProductos.map((item, index) => (
                <Grid item xs={12} sm={6} md={4} key={item.id}>
                  <Card 
                    elevation={2}
                    sx={{ 
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      '&:hover': {
                        elevation: 4,
                        transform: 'translateY(-2px)',
                        transition: 'all 0.2s ease-in-out'
                      }
                    }}
                  >
                    <CardContent sx={{ flexGrow: 1, py: 2 }}>
                      <Typography variant="h6" gutterBottom sx={{ 
                        fontSize: isMobile ? '0.9rem' : '1rem',
                        fontWeight: 'bold'
                      }}>
                        {item.producto_nombre}
                      </Typography>
                      
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="textSecondary" display="block">
                          Cantidad
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          {item.cantidad} unidades
                        </Typography>
                      </Box>
                      
                      <Box sx={{ mb: 1 }}>
                        <Typography variant="caption" color="textSecondary" display="block">
                          Precio Unitario
                        </Typography>
                        <Typography variant="body2" sx={{ fontWeight: 'medium' }}>
                          ${item.precio_unitario.toFixed(2)}
                        </Typography>
                      </Box>
                    </CardContent>
                    
                    <CardActions sx={{ 
                      justifyContent: 'space-between', 
                      px: 2, 
                      py: 1,
                      backgroundColor: 'grey.50'
                    }}>
                      <Box>
                        <Typography variant="caption" color="textSecondary" display="block">
                          Total
                        </Typography>
                        <Typography variant="h6" color="primary" sx={{ 
                          fontSize: isMobile ? '1rem' : '1.25rem',
                          fontWeight: 'bold'
                        }}>
                          ${(item.cantidad * item.precio_unitario).toFixed(2)}
                        </Typography>
                      </Box>
                      <IconButton 
                        onClick={() => quitarProducto(index)} 
                        color="error"
                        size={isMobile ? "small" : "medium"}
                        title="Eliminar producto"
                      >
                        <Delete fontSize={isMobile ? "small" : "medium"} />
                      </IconButton>
                    </CardActions>
                  </Card>
                </Grid>
              ))}
            </Grid>
            
            {/* Resumen total */}
            <Box sx={{ 
              mt: 2, 
              p: 2, 
              backgroundColor: 'grey.400', 
              borderRadius: 1,
              textAlign: 'center'
            }}>
              <Typography variant="h6" color="white" sx={{ fontWeight: 'bold' }}>
                Total General: ${detalleProductos.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0).toFixed(2)}
              </Typography>
            </Box>
          </Box>
        )}

        <Button 
          type="submit" 
          variant="contained" 
          color="primary" 
          sx={{ mt: 2 }}
          disabled={detalleProductos.length === 0}
          size={isMobile ? "large" : "large"}
          fullWidth={isMobile}
        >
          Transferir ({detalleProductos.length} productos)
        </Button>
      </Box>

      {mostrarQR && transferenciaCreada && (
        <Box sx={{ mt: 3, textAlign: 'center' }}>
          <Typography variant="subtitle1" gutterBottom>
            Escanea este QR para continuar el proceso de transferencia
          </Typography>
          <QRCodeSVG
            value={transferenciaCreada}
            size={isMobile ? 200 : 256}
            level="H"
            includeMargin={true}
          />
          <Typography variant="caption" sx={{ mt: 1, display: 'block', wordBreak: 'break-all' }}>
            {transferenciaCreada}
          </Typography>
        </Box>
      )}

      <Snackbar open={!!mensaje} autoHideDuration={3000} onClose={() => setMensaje('')}>
        <Alert onClose={() => setMensaje('')} severity="info" sx={{ width: '100%' }}>
          {mensaje}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

export default TransferirInventario;