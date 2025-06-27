import React, { useEffect, useState } from 'react';
import {
  Paper, Box, Typography, TextField, Button, Select, MenuItem, Snackbar, Alert,
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow, FormControl, InputLabel
} from '@mui/material';
import { supabase } from '../supabaseClient';

function Sucursales() {
  const [sucursales, setSucursales] = useState([]);
  const [nombre, setNombre] = useState('');
  const [pais, setPais] = useState('');
  const [direccion, setDireccion] = useState('');
  const [tipo, setTipo] = useState('');
  const [mensaje, setMensaje] = useState('');

  useEffect(() => {
    fetchSucursales();
  }, []);

  const fetchSucursales = async () => {
    const { data, error } = await supabase.from('sucursales').select('*');
    if (!error) setSucursales(data);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    if (nombre.trim().length < 3) {
      setMensaje('El nombre debe tener al menos 3 caracteres');
      return;
    }
    if (!pais || !tipo) {
      setMensaje('El país y el tipo son obligatorios');
      return;
    }
    const { error } = await supabase.from('sucursales').insert([
      { nombre, pais, direccion, tipo }
    ]);
    if (error) {
      setMensaje('Error al agregar sucursal: ' + error.message);
    } else {
      setMensaje('Sucursal agregada correctamente');
      setNombre('');
      setPais('');
      setDireccion('');
      setTipo('');
      fetchSucursales();
    }
  };

  return (
    <Box>
      <Paper elevation={3} sx={{ p: 4, mb: 4, maxWidth: 600, mx: 'auto' }}>
        <Typography variant="h6" gutterBottom sx={{ mb: 2 }}>Registrar Sucursal</Typography>
        <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} required />
          <FormControl fullWidth>
            <InputLabel>País</InputLabel>
            <Select
              value={pais}
              label="País"
              onChange={e => setPais(e.target.value)}
              displayEmpty
              renderValue={selected => {
                if (!selected) return <span style={{ color: '#aaa' }}>Seleccione un país...</span>;
                return selected;
              }}
            >
              <MenuItem value="" disabled>
                <em>Seleccione un país...</em>
              </MenuItem>
              <MenuItem value="Cuba">Cuba</MenuItem>
              <MenuItem value="EEUU">EEUU</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Dirección" value={direccion} onChange={e => setDireccion(e.target.value)} />
          <FormControl fullWidth>
            <InputLabel>Tipo</InputLabel>
            <Select
              value={tipo}
              label="Tipo"
              onChange={e => setTipo(e.target.value)}
              displayEmpty
              renderValue={selected => {
                if (!selected) return <span style={{ color: '#aaa' }}>Seleccione un tipo...</span>;
                return selected;
              }}
            >
              <MenuItem value="" disabled>
                <em>Seleccione un tipo...</em>
              </MenuItem>
              <MenuItem value="Tienda">Tienda</MenuItem>
              <MenuItem value="Almacén">Almacén</MenuItem>
            </Select>
          </FormControl>
          <Button type="submit" variant="contained" sx={{ mt: 2 }}>Agregar Sucursal</Button>
        </Box>
      </Paper>
      <Paper elevation={3} sx={{ p: 4, mb: 4, maxWidth: 950, mx: 'auto' }}>
        <Typography variant="h6" sx={{ mb: 2 }}>Lista de Sucursales</Typography>
        <TableContainer>
          <Table size="small" sx={{ minWidth: 600 }}>
            <TableHead>
              <TableRow sx={{ backgroundColor: '#f5f5f5' }}>
                <TableCell sx={{ fontWeight: 'bold' }}>Nombre</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>País</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Tipo</TableCell>
                <TableCell sx={{ fontWeight: 'bold' }}>Dirección</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {sucursales.map(s => (
                <TableRow key={s.id} hover>
                  <TableCell>{s.nombre}</TableCell>
                  <TableCell>{s.pais}</TableCell>
                  <TableCell>{s.tipo}</TableCell>
                  <TableCell>{s.direccion}</TableCell>
                </TableRow>
              ))}
              {sucursales.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} align="center" sx={{ color: '#888' }}>
                    Sin datos
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>
      <Snackbar open={!!mensaje} autoHideDuration={3000} onClose={() => setMensaje('')}>
        <Alert onClose={() => setMensaje('')} severity="success" sx={{ width: '100%' }}>
          {mensaje}
        </Alert>
      </Snackbar>
    </Box>
  );
}

export default Sucursales;