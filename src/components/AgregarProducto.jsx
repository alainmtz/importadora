import React, { useState, useEffect } from 'react';
import { Paper, Box, Typography, TextField, Button, Snackbar, Alert } from '@mui/material';
import { supabase } from '../supabaseClient';

function generarCodigo() {
  // 4 caracteres alfanuméricos en mayúsculas
  return Math.random().toString(36).substring(2, 6).toUpperCase();
}

function AgregarProducto({ onProductoAgregado, productoEditar, onEditFinish }) {
  const [nombre, setNombre] = useState('');
  const [categoria, setCategoria] = useState('');
  const [descripcion, setDescripcion] = useState('');
  const [codigo, setCodigo] = useState('');
  const [imagenUrl, setImagenUrl] = useState('');
  const [mensaje, setMensaje] = useState('');
  const [errores, setErrores] = useState({});

  useEffect(() => {
    if (productoEditar) {
      setNombre(productoEditar.nombre || '');
      setCategoria(productoEditar.categoria || '');
      setDescripcion(productoEditar.descripcion || '');
      setCodigo(productoEditar.codigo || '');
      setImagenUrl(productoEditar.imagen_url || '');
    } else {
      setNombre('');
      setCategoria('');
      setDescripcion('');
      setCodigo(generarCodigo());
      setImagenUrl('');
    }
  }, [productoEditar]);

  const validar = () => {
    const errs = {};
    if (nombre.trim().length < 3) errs.nombre = 'El nombre debe tener al menos 3 caracteres';
    if (categoria.trim().length < 3) errs.categoria = 'La categoría debe tener al menos 3 caracteres';
    if (descripcion.length > 200) errs.descripcion = 'La descripción no debe superar 200 caracteres';
    if (!/^[A-Z0-9]{4}$/.test(codigo)) errs.codigo = 'El código debe ser 4 caracteres alfanuméricos en mayúsculas';
    if (imagenUrl && !/^https?:\/\/.+\.(jpg|jpeg|png|gif)$/i.test(imagenUrl)) errs.imagenUrl = 'URL de imagen no válida';
    setErrores(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMensaje('');
    if (!validar()) return;

    if (productoEditar) {
      // Editar producto existente
      const { error } = await supabase
        .from('productos')
        .update({ nombre, categoria, descripcion, codigo, imagen_url: imagenUrl })
        .eq('id', productoEditar.id);
      if (error) {
        setMensaje('Error al editar producto: ' + error.message);
      } else {
        setMensaje('Producto editado correctamente');
        if (onEditFinish) onEditFinish();
      }
    } else {
      // Agregar producto nuevo
      const { error } = await supabase.from('productos').insert([
        { nombre, categoria, descripcion, codigo, imagen_url: imagenUrl }
      ]);
      if (error) {
        setMensaje('Error al agregar producto: ' + error.message);
      } else {
        setMensaje('Producto agregado correctamente');
        setNombre('');
        setCategoria('');
        setDescripcion('');
        setCodigo(generarCodigo());
        setImagenUrl('');
        if (onProductoAgregado) onProductoAgregado();
      }
    }
  };

  return (
    <Paper elevation={3} sx={{ p: 2, mb: 2, maxWidth: 950, width: '100%', mx: 'auto' }}>
      <Typography variant="h6" gutterBottom>
        {productoEditar ? 'Editar Producto' : 'Agregar Producto'}
      </Typography>
      <Box component="form" onSubmit={handleSubmit} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <TextField label="Nombre" value={nombre} onChange={e => setNombre(e.target.value)} required error={!!errores.nombre} helperText={errores.nombre} />
        <TextField label="Categoría" value={categoria} onChange={e => setCategoria(e.target.value)} required error={!!errores.categoria} helperText={errores.categoria} />
        <TextField label="Descripción" value={descripcion} onChange={e => setDescripcion(e.target.value)} multiline rows={2} error={!!errores.descripcion} helperText={errores.descripcion} />
        <TextField label="Código" value={codigo} onChange={e => setCodigo(e.target.value.toUpperCase().slice(0,4))} required inputProps={{ maxLength: 4 }} error={!!errores.codigo} helperText={errores.codigo || '4 caracteres alfanuméricos'} />
        <TextField label="URL de imagen" value={imagenUrl} onChange={e => setImagenUrl(e.target.value)} error={!!errores.imagenUrl} helperText={errores.imagenUrl || 'Debe ser una URL válida de imagen'} />
        <Button type="submit" variant="contained" color="primary">
          {productoEditar ? 'Guardar Cambios' : 'Agregar'}
        </Button>
        {productoEditar && (
          <Button variant="outlined" color="secondary" onClick={onEditFinish}>
            Cancelar
          </Button>
        )}
      </Box>
      <Snackbar open={!!mensaje} autoHideDuration={3000} onClose={() => setMensaje('')}>
        <Alert onClose={() => setMensaje('')} severity="success" sx={{ width: '100%' }}>
          {mensaje}
        </Alert>
      </Snackbar>
    </Paper>
  );
}

export default AgregarProducto;