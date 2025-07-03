import React, { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper,
  Button, IconButton, Snackbar, Alert, Dialog, DialogTitle, DialogContent, DialogActions, Select, MenuItem, TextField, Box, Typography, InputAdornment
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import SearchIcon from '@mui/icons-material/Search';

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

  // Generar código aleatorio de 4 caracteres (si es necesario al crear producto)
  // function generarCodigo() {
  //   return Math.random().toString(36).substring(2, 6).toUpperCase();
  // }

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
      const { error } = await supabase.from('productos').delete().eq('id', productoEliminar);
      if (error) setMensaje('Error al eliminar producto');
      else setMensaje('Producto eliminado');
      setProductoEliminar(null);
      setOpenDialog(false);
      if (onProductoEliminado) onProductoEliminado(productoEliminar);
    }
  };

  // Filtro por búsqueda y sucursal
  const productosFiltrados = productos.filter(prod => {
    const coincideBusqueda =
      prod.nombre?.toLowerCase().includes(busqueda.toLowerCase()) ||
      prod.codigo?.toLowerCase().includes(busqueda.toLowerCase());
    if (!coincideBusqueda) return false;
    if (!filtroSucursal) return true;
    // Si hay filtro de sucursal, mostrar solo productos que tengan inventario en esa sucursal
    // (puedes ajustar esto según tu lógica)
    // Aquí solo mostramos todos, pero podrías consultar inventario si lo necesitas
    return true;
  });

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 2 }}>Lista de Productos</Typography>
      <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
        <TextField bgcolor="#fff"
          placeholder="Buscar por nombre o código"
          value={busqueda}
          onChange={e => setBusqueda(e.target.value)}
          size="small"
          slotProps={{
            input: {
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon />
                </InputAdornment>
              ),
            },
          }}
          sx={{ minWidth: 220 }}
        />
        <Select
          value={filtroSucursal}
          onChange={e => setFiltroSucursal(e.target.value)}
          displayEmpty
          size="small"
          sx={{ minWidth: 180 }}
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
              <TableCell align="center">Acciones</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {productosFiltrados.map(prod => (
              <TableRow key={prod.id}>
                <TableCell>
                  {prod.imagen_url
                    ? <img src={prod.imagen_url} alt={prod.nombre} style={{ width: 50, height: 50, objectFit: 'cover', borderRadius: 4 }} />
                    : <Box sx={{ width: 50, height: 50, bgcolor: '#eee', borderRadius: 4, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#888' }}>Sin imagen</Box>
                  }
                </TableCell>
                <TableCell>
                  <Typography fontWeight="bold" fontFamily="monospace">{prod.codigo || '----'}</Typography>
                </TableCell>
                <TableCell>{prod.nombre}</TableCell>
                <TableCell>{prod.categoria}</TableCell>
                <TableCell align="center">
                  <IconButton color="primary" onClick={() => onEditar(prod)}><EditIcon /></IconButton>
                  <IconButton color="error" onClick={() => handleEliminar(prod.id)}><DeleteIcon /></IconButton>
                  <Button
                    variant="outlined"
                    size="small"
                    sx={{ ml: 1 }}
                    onClick={() => setAsignarId(prod.id)}
                  >
                    Asignar a Sucursal
                  </Button>
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
    </Box>
  );
}

export default ListaProductos;