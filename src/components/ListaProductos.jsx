import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, TextField, Box, Typography, InputAdornment
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';
import CloseIcon from '@mui/icons-material/Close';
import Tooltip from '@mui/material/Tooltip';
import InfoIcon from '@mui/icons-material/Info';
import AssignmentTurnedInIcon from '@mui/icons-material/AssignmentTurnedIn';
import {QRCodeSVG} from 'qrcode.react';
import PrintIcon from '@mui/icons-material/Print';

function ListaProductos({ onEditar, onProductoEliminado, onAsignacion }) {
  const [productos, setProductos] = useState([]);
  const [loading, setLoading] = useState(true);
  const [sucursales, setSucursales] = useState([]);
  const [asignarId, setAsignarId] = useState(null);
  const [sucursalSeleccionada, setSucursalSeleccionada] = useState('');
  const [cantidad, setCantidad] = useState(1);
  const [mensaje, setMensaje] = useState('');
  const [openDialog, setOpenDialog] = useState(false);
  const [productoEliminar, setProductoEliminar] = useState(null);
  const [busqueda, setBusqueda] = useState('');
  const [filtroSucursal, setFiltroSucursal] = useState('');
  const [inventarioSucursal, setInventarioSucursal] = useState([]);
  const [imagenAmpliada, setImagenAmpliada] = useState(null);
  const [qrAmpliado, setQrAmpliado] = useState(null);
  const [openExportQR, setOpenExportQR] = useState(false);
  const [productoDetalle, setProductoDetalle] = useState(null);

  useEffect(() => {
    async function fetchProductos() {
      setLoading(true);
      const { data, error } = await supabase
        .from('productos')
        .select('*');
      if (!error) setProductos(data);
      setLoading(false);
    }
    fetchProductos();
    async function fetchSucursales() {
      const { data } = await supabase.from('sucursales').select('*');
      setSucursales(data || []);
    }
    fetchSucursales();
  }, [onProductoEliminado]);

  // Cargar inventario de la sucursal seleccionada para el filtro
  useEffect(() => {
    async function fetchInventarioSucursal() {
      if (!filtroSucursal) {
        setInventarioSucursal([]);
        return;
      }
      const { data } = await supabase
        .from('inventario')
        .select('producto_id')
        .eq('sucursal_id', filtroSucursal);
      setInventarioSucursal(data ? data.map(i => i.producto_id) : []);
    }
    fetchInventarioSucursal();
  }, [filtroSucursal]);

  const handleAsignar = async (productoId) => {
    setMensaje('');
    if (!sucursalSeleccionada || cantidad < 1) {
      setMensaje('Seleccione sucursal y cantidad válida');
      return;
    }
    const { data: existente } = await supabase
      .from('inventario')
      .select('*')
      .eq('producto_id', productoId)
      .eq('sucursal_id', sucursalSeleccionada)
      .single();

    if (existente) {
      const nuevaCantidad = (existente.cantidad || 0) + cantidad;
      const { error } = await supabase
        .from('inventario')
        .update({ cantidad: nuevaCantidad })
        .eq('id', existente.id);
      if (error) setMensaje('Error al actualizar inventario');
      else setMensaje('Inventario actualizado');
    } else {
      const { error } = await supabase
        .from('inventario')
        .insert([{ producto_id: productoId, sucursal_id: sucursalSeleccionada, cantidad }]);
      if (error) setMensaje('Error al asignar inventario');
      else setMensaje('Inventario asignado');
    }
    setAsignarId(null);
    setSucursalSeleccionada('');
    setCantidad(1);
    if (onAsignacion) onAsignacion();
  };

  const handleEliminar = (id) => {
    setProductoEliminar(id);
    setOpenDialog(true);
  };

  const confirmarEliminar = async () => {
    if (productoEliminar) {
      setMensaje('');
      // Elimina primero en detalle_compras
      await supabase.from('detalle_compras').delete().eq('producto_id', productoEliminar);
      // Elimina primero en detalle_ventas
      await supabase.from('detalle_ventas').delete().eq('producto_id', productoEliminar);
      // Elimina inventario relacionado
      await supabase.from('inventario').delete().eq('producto_id', productoEliminar);
      // Ahora elimina el producto
      const { error } = await supabase.from('productos').delete().eq('id', productoEliminar);
      if (error) setMensaje('Error al eliminar producto');
      else {
        setMensaje('Producto eliminado');
        setProductos(prev => prev.filter(p => p.id !== productoEliminar));
        if (onProductoEliminado) onProductoEliminado();
      }
      setProductoEliminar(null);
      setOpenDialog(false);
    }
  };

  // Filtro por búsqueda y sucursal
  const productosFiltrados = productos.filter(prod => {
    const coincideBusqueda =
      prod.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      prod.codigo?.toLowerCase().includes(busqueda.toLowerCase());
    if (!coincideBusqueda) return false;
    if (!filtroSucursal) return true;
    // Solo muestra productos que tienen inventario en la sucursal seleccionada
    return inventarioSucursal.includes(prod.id);
  });

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Lista de Productos</Typography>
      <Button
        variant="contained"
        color="secondary"
        startIcon={<PrintIcon />}
        sx={{ mb: 2 }}
        onClick={() => setOpenExportQR(true)}
      >
        Exportar QR
      </Button>
      <Box sx={{
        display: 'flex',
        gap: 2,
        mb: 2,
        flexWrap: 'wrap',
        alignItems: 'center',
        background: '#f5f7fa',
        p: 2,
        borderRadius: 2
      }}>
        <TextField
          placeholder="Buscar por nombre o código"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          size="small"
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon />
              </InputAdornment>
            ),
            style: { background: '#fff' }
          }}
          sx={{ minWidth: 220, maxWidth: 300 }}
        />
        <Select
          value={filtroSucursal}
          onChange={e => setFiltroSucursal(e.target.value)}
          displayEmpty
          size="small"
          sx={{ minWidth: 180, background: '#fff' }}
        >
          <MenuItem value="">Todas las sucursales</MenuItem>
          {sucursales.map(s => (
            <MenuItem key={s.id} value={s.id}>{s.nombre} ({s.tipo} - {s.pais})</MenuItem>
          ))}
        </Select>
      </Box>
      <TableContainer component={Paper} sx={{ maxWidth: 1100 }}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>Imagen</TableCell>
              <TableCell>Código</TableCell>
              <TableCell>Nombre</TableCell>
              <TableCell>Categoría</TableCell>
              <TableCell>QR</TableCell>
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {productosFiltrados.map(prod => (
              <TableRow key={prod.id}>
                <TableCell>
                  {prod.imagen_url
                    ? (
                      <img
                        src={prod.imagen_url}
                        alt={prod.nombre}
                        style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4, cursor: 'pointer' }}
                        onClick={() => setImagenAmpliada(prod.imagen_url)}
                      />
                    )
                    : <Box sx={{ width: 50, height: 50, bgcolor: '#eee', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Sin imagen</Box>
                  }
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold" fontFamily="monospace">{prod.codigo || '----'}</Typography>
                </TableCell>
                <TableCell>{prod.nombre}</TableCell>
                <TableCell>{prod.categoria}</TableCell>
                <TableCell>
                  <Box sx={{ cursor: 'pointer', display: 'inline-block' }} onClick={() => setQrAmpliado(`https://importadora.vercel.app/productos/${prod.id}`)}>
                    <QRCodeSVG
                      value={`https://importadora.vercel.app/productos/${prod.id}`}
                      size={48}
                      level="M"
                      includeMargin={false}
                    />
                  </Box>
                </TableCell>
                <TableCell align="center">
                  <Tooltip title="Editar">
                    <IconButton color="primary" onClick={() => onEditar(prod)}>
                      <EditIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Eliminar">
                    <IconButton color="error" onClick={() => handleEliminar(prod.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Asignar a Sucursal">
                    <IconButton
                      color="secondary"
                      onClick={() => setAsignarId(prod.id)}
                      sx={{ ml: 1 }}
                    >
                      <AssignmentTurnedInIcon />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Ver detalles">
                    <IconButton
                      color="info"
                      onClick={() => setProductoDetalle(prod)}
                      sx={{ ml: 1 }}
                    >
                      <InfoIcon />
                    </IconButton>
                  </Tooltip>
                  {asignarId === prod.id && (
                    <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Select
                        value={sucursalSeleccionada}
                        onChange={e => setSucursalSeleccionada(e.target.value)}
                        size="small"
                        displayEmpty
                        sx={{ minWidth: 180 }}
                      >
                        <MenuItem value="">Seleccione sucursal</MenuItem>
                        {sucursales.map(s => (
                          <MenuItem key={s.id} value={s.id}>
                            {s.nombre} ({s.tipo} - {s.pais})
                          </MenuItem>
                        ))}
                      </Select>
                      <TextField
                        type="number"
                        size="small"
                        label="Cantidad"
                        inputProps={{ min: 1 }}
                        value={cantidad}
                        onChange={e => setCantidad(Number(e.target.value))}
                        sx={{ width: 90 }}
                      />
                      <Button variant="contained" size="small" onClick={() => handleAsignar(prod.id)}>Guardar</Button>
                      <Button variant="outlined" size="small" color="secondary" onClick={() => setAsignarId(null)}>Cancelar</Button>
                    </Box>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
      <Snackbar
        open={!!mensaje}
        autoHideDuration={3000}
        onClose={() => setMensaje('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={() => setMensaje('')} severity="info" sx={{ width: '100%' }}>
          {mensaje}
        </Alert>
      </Snackbar>
      <Dialog open={openDialog} onClose={() => setOpenDialog(false)}>
        <DialogTitle>Confirmar eliminación</DialogTitle>
        <DialogContent>¿Está seguro que desea eliminar este producto?</DialogContent>
        <DialogActions>
          <Button onClick={() => setOpenDialog(false)}>Cancelar</Button>
          <Button onClick={confirmarEliminar} color="error">Eliminar</Button>
        </DialogActions>
      </Dialog>
      {/* Modal para imagen ampliada */}
      <Dialog
        open={!!imagenAmpliada}
        onClose={() => setImagenAmpliada(null)}
        maxWidth="xl"
        PaperProps={{
          sx: { width: '80vw', maxWidth: '80vw', textAlign: 'center', background: '#222' }
        }}
      >
        <IconButton
          onClick={() => setImagenAmpliada(null)}
          sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', zIndex: 1 }}
        >
          <CloseIcon />
        </IconButton>
        {imagenAmpliada && (
          <img
            src={imagenAmpliada}
            alt="Producto ampliado"
            style={{ maxWidth: '100%', maxHeight: '80vh', margin: 'auto', display: 'block', borderRadius: 8 }}
          />
        )}
      </Dialog>
      {/* Modal para QR ampliado */}
      <Dialog
        open={!!qrAmpliado}
        onClose={() => setQrAmpliado(null)}
        maxWidth="sm"
        PaperProps={{
          sx: { width: 'auto', textAlign: 'center', background: '#222' }
        }}
      >
        <IconButton
          onClick={() => setQrAmpliado(null)}
          sx={{ position: 'absolute', top: 8, right: 8, color: '#fff', zIndex: 1 }}
        >
          <CloseIcon />
        </IconButton>
        {qrAmpliado && (
          <Box sx={{ p: 4 }}>
            <QRCodeSVG
              value={qrAmpliado}
              size={256}
              level="H"
              includeMargin={true}
              bgColor="#fff"
            />
            <Typography variant="body2" sx={{ color: '#fff', mt: 2, wordBreak: 'break-all' }}>
              {qrAmpliado}
            </Typography>
          </Box>
        )}
      </Dialog>
      {/* Modal para exportar todos los QR */}
      <Dialog
        open={openExportQR}
        onClose={() => setOpenExportQR(false)}
        maxWidth="lg"
        PaperProps={{
          sx: { p: 4, background: '#fff' }
        }}
      >
        <DialogTitle>
          QRs de productos
          <IconButton
            onClick={() => setOpenExportQR(false)}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          <Box
            sx={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: 4,
              justifyContent: 'center',
              p: 2
            }}
          >
            {productosFiltrados.map(prod => (
              <Box
                key={prod.id}
                sx={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  width: 180,
                  mb: 2
                }}
              >
                <QRCodeSVG
                  value={`https://importadora.vercel.app/productos/${prod.id}`}
                  size={128}
                  level="M"
                  includeMargin={true}
                />
                <Typography variant="subtitle1" sx={{ mt: 1, fontWeight: 'bold', textAlign: 'center' }}>
                  {prod.nombre}
                </Typography>
                <Typography variant="body2" sx={{ fontFamily: 'monospace', textAlign: 'center' }}>
                  {prod.codigo}
                </Typography>
              </Box>
            ))}
          </Box>
          <Box sx={{ textAlign: 'center', mt: 2 }}>
            <Button
              variant="outlined"
              startIcon={<PrintIcon />}
              onClick={() => window.print()}
            >
              Imprimir / Guardar como PDF
            </Button>
          </Box>
        </DialogContent>
      </Dialog>
      {/* Modal para detalles del producto */}
      <Dialog
        open={!!productoDetalle}
        onClose={() => setProductoDetalle(null)}
        maxWidth="sm"
        PaperProps={{
          sx: { p: 3, background: '#fff' }
        }}
      >
        <DialogTitle>
          Detalles del producto
          <IconButton
            onClick={() => setProductoDetalle(null)}
            sx={{ position: 'absolute', top: 8, right: 8 }}
          >
            <CloseIcon />
          </IconButton>
        </DialogTitle>
        <DialogContent>
          {productoDetalle && (
            <Box sx={{ textAlign: 'center', p: 2 }}>
              {productoDetalle.imagen_url && (
                <img
                  src={productoDetalle.imagen_url}
                  alt={productoDetalle.nombre}
                  style={{ width: 160, height: 160, objectFit: 'cover', borderRadius: 8, marginBottom: 16 }}
                />
              )}
              <Typography variant="h6" gutterBottom>{productoDetalle.nombre}</Typography>
              <Typography variant="subtitle1" gutterBottom>
                <b>Código:</b> {productoDetalle.codigo}
              </Typography>
              <Typography variant="body1" gutterBottom>
                <b>Categoría:</b> {productoDetalle.categoria}
              </Typography>
              {productoDetalle.descripcion && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <b>Descripción:</b> {productoDetalle.descripcion}
                </Typography>
              )}
              {/* Agrega aquí más campos si lo deseas */}
            </Box>
          )}
        </DialogContent>
      </Dialog>
    </Box>
  );
}

export default ListaProductos;